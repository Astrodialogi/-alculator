import json, os, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from http.server import BaseHTTPRequestHandler
import swisseph as swe

PLANETS = [('Солнце',swe.SUN,'☉'),('Луна',swe.MOON,'☽'),('Меркурий',swe.MERCURY,'☿'),('Венера',swe.VENUS,'♀'),('Марс',swe.MARS,'♂'),('Юпитер',swe.JUPITER,'♃'),('Сатурн',swe.SATURN,'♄'),('Уран',swe.URANUS,'♅'),('Нептун',swe.NEPTUNE,'♆'),('Плутон',swe.PLUTO,'♇')]
SIGNS=['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы']

def coords(lon):
    lon=lon%360; i=int(lon//30); within=lon-i*30
    return {'sign':SIGNS[i],'sign_index':i,'degree':int(within),'minute':int(round((within%1)*60))%60,'longitude':round(lon,6)}

def jd_for(dt):
    dt=dt.astimezone(timezone.utc)
    return swe.julday(dt.year,dt.month,dt.day,dt.hour+dt.minute/60+dt.second/3600)

def timezone_at(lat,lng):
    user=os.environ.get('GEONAMES_USERNAME')
    if not user: raise ValueError('Поиск часового пояса не настроен (GEONAMES_USERNAME).')
    params=urllib.parse.urlencode({'lat':lat,'lng':lng,'username':user})
    with urllib.request.urlopen('https://secure.geonames.org/timezoneJSON?'+params,timeout=10) as resp:
        data=json.load(resp)
    if 'status' in data: raise ValueError(data['status'].get('message','Ошибка GeoNames'))
    tzid=data.get('timezoneId')
    if not tzid: raise ValueError('Часовой пояс города не найден.')
    return tzid

def local_to_utc(naive,zone):
    valid=[]
    for fold in (0,1):
        aware=naive.replace(tzinfo=zone,fold=fold)
        utc=aware.astimezone(timezone.utc)
        if utc.astimezone(zone).replace(tzinfo=None)==naive and utc not in valid: valid.append(utc)
    if not valid: raise ValueError('Указанное местное время не существовало из-за перевода часов. Уточните время рождения.')
    if len(valid)>1: raise ValueError('Указанное время неоднозначно из-за перевода часов. Нужен уточнённый UTC-сдвиг.')
    return valid[0]

def position(jd,planet):
    values,flag=swe.calc_ut(jd,planet,swe.FLG_SWIEPH|swe.FLG_SPEED)
    return {**coords(values[0]),'retrograde':values[3]<0,'speed':round(values[3],6)}

def compute(data):
    birth_date=str(data['date']); date=datetime.strptime(birth_date,'%Y-%m-%d')
    lat=float(data['lat']); lng=float(data['lng'])
    if not -90<=lat<=90 or not -180<=lng<=180: raise ValueError('Некорректные координаты.')
    zone=ZoneInfo(timezone_at(lat,lng))
    time=data.get('time')
    known=bool(time)
    if known:
        try: hour,minute=map(int,str(time).split(':'))
        except Exception: raise ValueError('Время должно быть в формате ЧЧ:ММ.')
        if not 0<=hour<24 or not 0<=minute<60: raise ValueError('Некорректное время рождения.')
        local=datetime(date.year,date.month,date.day,hour,minute)
        utc=local_to_utc(local,zone)
    else:
        local=datetime(date.year,date.month,date.day,12)
        utc=local_to_utc(local,zone)
    jd=jd_for(utc)
    planets=[]
    for name,number,glyph in PLANETS:
        p=position(jd,number)
        item={'name':name,'glyph':glyph,**p}
        if not known:
            start=datetime(date.year,date.month,date.day)
            end=start+timedelta(days=1)
            # Sample the entire local day to identify possible sign changes, including DST transitions.
            samples=[]
            for h in range(25):
                moment=start+timedelta(hours=h)
                for fold in (0,1):
                    aware=moment.replace(tzinfo=zone,fold=fold)
                    u=aware.astimezone(timezone.utc)
                    if u.astimezone(zone).replace(tzinfo=None)==moment:
                        samples.append(position(jd_for(u),number)['sign'])
            possible=list(dict.fromkeys(samples))
            item['possible_signs']=possible
            item['sign_uncertain']=len(possible)>1
            item['degree_approximate']=True
        planets.append(item)
    result={'timezone':zone.key,'time_known':known,'planets':planets,'ascendant':None,'mc':None,'houses':None,'aspects':[]}
    if known:
        # Swiss Ephemeris houses_ex returns tropical ecliptic ascendant and MC in ascmc.
        cusps,angles=swe.houses_ex(jd,lat,lng,b'P')
        asc=coords(angles[0]); mc=coords(angles[1]); result['ascendant']=asc; result['mc']=mc
        result['houses']={'placidus_cusps':[coords(x) for x in cusps], 'whole_sign_start':asc['sign']}
        for item in planets:
            item['whole_sign_house']=((item['sign_index']-asc['sign_index'])%12)+1
            # Placidus house position is assigned by successive cusp arcs, handling wrapped longitude.
            for k in range(12):
                a=cusps[k]%360; b=cusps[(k+1)%12]%360; v=item['longitude']
                if (v-a)%360 < (b-a)%360:
                    item['placidus_house']=k+1; break
        aspects=[('Соединение',0,8),('Секстиль',60,4),('Квадрат',90,6),('Трин',120,6),('Оппозиция',180,8)]
        for i,a in enumerate(planets):
            for b in planets[i+1:]:
                diff=abs((a['longitude']-b['longitude']+180)%360-180)
                candidates=[(abs(diff-angle),name) for name,angle,orb in aspects if abs(diff-angle)<=orb]
                if candidates:
                    delta,name=min(candidates)
                    result['aspects'].append({'a':a['name'],'b':b['name'],'aspect':name,'orb':round(delta,2)})
    return result

class handler(BaseHTTPRequestHandler):
    def send_json(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(raw)))
        self.end_headers(); self.wfile.write(raw)
    def do_POST(self):
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length>10000: return self.send_json(413,{'error':'Слишком большой запрос.'})
            payload=json.loads(self.rfile.read(length))
            self.send_json(200,compute(payload))
        except (ValueError,KeyError,OverflowError) as e: self.send_json(400,{'error':str(e)})
        except Exception as e: self.send_json(500,{'error':'Не удалось выполнить расчёт. Проверьте данные и настройки сервиса.'})
