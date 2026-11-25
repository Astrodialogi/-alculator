
import json
import os
import urllib.parse
import urllib.request

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from http.server import BaseHTTPRequestHandler

import swisseph as swe


# =========================================
# ПЛАНЕТЫ И ЗНАКИ ЗОДИАКА
# =========================================

PLANETS = [
    ('Солнце', swe.SUN, '☉'),
    ('Луна', swe.MOON, '☽'),
    ('Меркурий', swe.MERCURY, '☿'),
    ('Венера', swe.VENUS, '♀'),
    ('Марс', swe.MARS, '♂'),
    ('Юпитер', swe.JUPITER, '♃'),
    ('Сатурн', swe.SATURN, '♄'),
    ('Уран', swe.URANUS, '♅'),
    ('Нептун', swe.NEPTUNE, '♆'),
    ('Плутон', swe.PLUTO, '♇')
]

SIGNS = [
    'Овен',
    'Телец',
    'Близнецы',
    'Рак',
    'Лев',
    'Дева',
    'Весы',
    'Скорпион',
    'Стрелец',
    'Козерог',
    'Водолей',
    'Рыбы'
]

HOUSE_SYSTEMS = {
    'placidus': 'Плацидус',
    'whole_sign': 'Целознаковая',
    'equal': 'Равнодомная'
}


# =========================================
# КООРДИНАТЫ В ЗОДИАКЕ
# =========================================

def coords(lon):

    lon = lon % 360

    i = int(lon // 30)

    within = lon - i * 30

    total_minutes = int(within * 60)

    degree = total_minutes // 60

    minute = total_minutes % 60

    return {
        'sign': SIGNS[i],
        'sign_index': i,
        'degree': degree,
        'minute': minute,
        'longitude': lon
    }


# =========================================
# ЮЛИАНСКАЯ ДАТА
# =========================================

def jd_for(dt):

    dt = dt.astimezone(timezone.utc)

    return swe.julday(
        dt.year,
        dt.month,
        dt.day,
        dt.hour +
        dt.minute / 60 +
        dt.second / 3600
    )


# =========================================
# ЧАСОВОЙ ПОЯС
# =========================================

def timezone_at(lat, lng):

    user = os.environ.get('GEONAMES_USERNAME')

    if not user:
        raise ValueError(
            'Поиск часового пояса не настроен '
            '(GEONAMES_USERNAME).'
        )

    params = urllib.parse.urlencode({
        'lat': lat,
        'lng': lng,
        'username': user
    })

    url = (
        'https://secure.geonames.org/timezoneJSON?'
        + params
    )

    with urllib.request.urlopen(
        url,
        timeout=10
    ) as resp:

        data = json.load(resp)

    if 'status' in data:

        raise ValueError(
            data['status'].get(
                'message',
                'Ошибка GeoNames'
            )
        )

    tzid = data.get('timezoneId')

    if not tzid:

        raise ValueError(
            'Часовой пояс города не найден.'
        )

    return tzid


# =========================================
# ПЕРЕВОД МЕСТНОГО ВРЕМЕНИ В UTC
# =========================================

def local_to_utc(naive, zone):

    valid = []

    for fold in (0, 1):

        aware = naive.replace(
            tzinfo=zone,
            fold=fold
        )

        utc = aware.astimezone(timezone.utc)

        restored = utc.astimezone(
            zone
        ).replace(tzinfo=None)

        if restored == naive and utc not in valid:

            valid.append(utc)

    if not valid:

        raise ValueError(
            'Указанное местное время не существовало '
            'из-за перевода часов. '
            'Уточните время рождения.'
        )

    if len(valid) > 1:

        raise ValueError(
            'Указанное время неоднозначно '
            'из-за перевода часов. '
            'Нужен уточнённый UTC-сдвиг.'
        )

    return valid[0]


# =========================================
# ПОЛОЖЕНИЯ ПЛАНЕТ
# =========================================

def position(jd, planet):

    values, flag = swe.calc_ut(
        jd,
        planet,
        swe.FLG_SWIEPH | swe.FLG_SPEED
    )

    return {
        **coords(values[0]),
        'retrograde': values[3] < 0,
        'speed': round(values[3], 6)
    }


# =========================================
# ОПРЕДЕЛЕНИЕ ДОМА ПЛАНЕТЫ
# =========================================

def find_house(longitude, cusps):

    longitude = longitude % 360

    for k in range(12):

        a = cusps[k] % 360

        b = cusps[(k + 1) % 12] % 360

        arc = (b - a) % 360

        distance = (longitude - a) % 360

        if distance < arc:

            return k + 1

    return None


# =========================================
# РАСЧЁТ ТРЁХ СИСТЕМ ДОМОВ
# =========================================

def calculate_houses(jd, lat, lng):

    # Равнодомная система от Асцендента.
    # Используется также для получения ASC и MC
    # независимо от доступности Плацидуса.

    equal_cusps, angles = swe.houses_ex(
        jd,
        lat,
        lng,
        b'E'
    )

    asc_lon = angles[0] % 360

    mc_lon = angles[1] % 360

    asc = coords(asc_lon)

    mc = coords(mc_lon)


    # Целознаковая система:
    # первый дом начинается с 0 градусов
    # знака Асцендента.

    whole_sign_start = (
        int(asc_lon // 30) * 30
    )

    whole_sign_cusps = tuple(
        (whole_sign_start + i * 30) % 360
        for i in range(12)
    )


    # Плацидус

    placidus_cusps = None

    placidus_available = True

    placidus_error = None

    try:

        placidus_cusps, _ = swe.houses_ex(
            jd,
            lat,
            lng,
            b'P'
        )

    except swe.Error:

        placidus_available = False

        placidus_error = (
            'Система Плацидуса недоступна '
            'для указанных координат. '
            'Выбери целознаковую или '
            'равнодомную систему.'
        )


    # Куспиды всех трёх систем

    systems = {

        'placidus': {

            'name': HOUSE_SYSTEMS['placidus'],

            'available': placidus_available,

            'error': placidus_error,

            'cusps': [
                coords(x)
                for x in placidus_cusps
            ] if placidus_cusps is not None else []

        },

        'whole_sign': {

            'name': HOUSE_SYSTEMS['whole_sign'],

            'available': True,

            'error': None,

            'cusps': [
                coords(x)
                for x in whole_sign_cusps
            ]

        },

        'equal': {

            'name': HOUSE_SYSTEMS['equal'],

            'available': True,

            'error': None,

            'cusps': [
                coords(x)
                for x in equal_cusps
            ]

        }

    }

    return {

        'ascendant': asc,

        'mc': mc,

        'systems': systems,

        'raw_cusps': {
            'placidus': placidus_cusps,
            'whole_sign': whole_sign_cusps,
            'equal': equal_cusps
        }

    }


# =========================================
# АСПЕКТЫ МЕЖДУ ПЛАНЕТАМИ
# =========================================

def calculate_aspects(planets):

    aspect_types = [
        ('Соединение', 0, 8),
        ('Секстиль', 60, 4),
        ('Квадрат', 90, 6),
        ('Трин', 120, 6),
        ('Оппозиция', 180, 8)
    ]

    result = []

    for i, a in enumerate(planets):

        for b in planets[i + 1:]:

            diff = abs(
                (
                    a['longitude'] -
                    b['longitude'] +
                    180
                ) % 360 - 180
            )

            candidates = [

                (abs(diff - angle), name)

                for name, angle, orb in aspect_types

                if abs(diff - angle) <= orb

            ]

            if candidates:

                delta, name = min(candidates)

                result.append({

                    'a': a['name'],

                    'b': b['name'],

                    'aspect': name,

                    'orb': round(delta, 2)

                })

    return result


# =========================================
# ОСНОВНОЙ РАСЧЁТ НАТАЛЬНОЙ КАРТЫ
# =========================================

def compute(data):

    birth_date = str(data['date'])

    date = datetime.strptime(
        birth_date,
        '%Y-%m-%d'
    )

    lat = float(data['lat'])

    lng = float(data['lng'])

    if not (
        -90 <= lat <= 90
        and
        -180 <= lng <= 180
    ):

        raise ValueError(
            'Некорректные координаты.'
        )

    zone = ZoneInfo(
        timezone_at(lat, lng)
    )

    time = data.get('time')

    known = bool(time)


    # Время рождения

    if known:

        try:

            hour, minute = map(
                int,
                str(time).split(':')
            )

        except Exception:

            raise ValueError(
                'Время должно быть '
                'в формате ЧЧ:ММ.'
            )

        if not (
            0 <= hour < 24
            and
            0 <= minute < 60
        ):

            raise ValueError(
                'Некорректное время рождения.'
            )

        local = datetime(
            date.year,
            date.month,
            date.day,
            hour,
            minute
        )

        utc = local_to_utc(local, zone)

    else:

        local = datetime(
            date.year,
            date.month,
            date.day,
            12
        )

        utc = local_to_utc(local, zone)


    jd = jd_for(utc)

    planets = []


    # Положения планет

    for name, number, glyph in PLANETS:

        p = position(jd, number)

        item = {
            'name': name,
            'glyph': glyph,
            **p
        }


        # Расчёт при неизвестном времени

        if not known:

            start = datetime(
                date.year,
                date.month,
                date.day
            )

            samples = []

            for h in range(25):

                moment = start + timedelta(hours=h)

                if h == 24:
                    moment -= timedelta(seconds=1)

                for fold in (0, 1):

                    aware = moment.replace(
                        tzinfo=zone,
                        fold=fold
                    )

                    u = aware.astimezone(
                        timezone.utc
                    )

                    restored = u.astimezone(
                        zone
                    ).replace(tzinfo=None)

                    if restored == moment:

                        samples.append(
                            position(
                                jd_for(u),
                                number
                            )['sign']
                        )

            possible = list(
                dict.fromkeys(samples)
            )

            item['possible_signs'] = possible

            item['sign_uncertain'] = (
                len(possible) > 1
            )

            item['degree_approximate'] = True

        planets.append(item)


    # Структура результата

    result = {

        'timezone': zone.key,

        'time_known': known,

        'planets': planets,

        'ascendant': None,

        'mc': None,

        'houses': None,

        'house_systems': None,

        'default_house_system': 'placidus',

        'aspects': []

    }


    # Дома рассчитываются только
    # при известном времени рождения

    if known:

        if abs(lat) == 90:

            raise ValueError(
                'Расчёт Асцендента непосредственно '
                'на географическом полюсе невозможен.'
            )

        house_data = calculate_houses(
            jd,
            lat,
            lng
        )

        asc = house_data['ascendant']

        mc = house_data['mc']

        systems = house_data['systems']

        raw_cusps = house_data['raw_cusps']

        result['ascendant'] = asc

        result['mc'] = mc

        result['house_systems'] = systems


        # Сохраняем совместимость
        # с предыдущей версией сайта

        result['houses'] = {

            'placidus_cusps':
                systems['placidus']['cusps'],

            'whole_sign_start':
                asc['sign'],

            'whole_sign_cusps':
                systems['whole_sign']['cusps'],

            'equal_cusps':
                systems['equal']['cusps']

        }


        # Если Плацидус недоступен,
        # по умолчанию используем Whole Sign

        if not systems['placidus']['available']:

            result['default_house_system'] = (
                'whole_sign'
            )


        # Принадлежность каждой планеты
        # к дому в каждой системе

        for item in planets:

            longitude = item['longitude']

            item['whole_sign_house'] = (

                (
                    item['sign_index'] -
                    asc['sign_index']
                ) % 12

            ) + 1

            item['equal_house'] = find_house(
                longitude,
                raw_cusps['equal']
            )

            item['placidus_house'] = None

            if raw_cusps['placidus'] is not None:

                item['placidus_house'] = find_house(
                    longitude,
                    raw_cusps['placidus']
                )


            # Унифицированная структура
            # для переключателя на сайте

            item['houses'] = {

                'placidus':
                    item['placidus_house'],

                'whole_sign':
                    item['whole_sign_house'],

                'equal':
                    item['equal_house']

            }


        # Аспекты между планетами

        result['aspects'] = calculate_aspects(
            planets
        )

    return result


# =========================================
# API
# =========================================

class handler(BaseHTTPRequestHandler):

    def send_json(self, status, data):

        raw = json.dumps(
            data,
            ensure_ascii=False
        ).encode('utf-8')

        self.send_response(status)

        self.send_header(
            'Content-Type',
            'application/json; charset=utf-8'
        )

        self.send_header(
            'Cache-Control',
            'no-store'
        )

        self.send_header(
            'Content-Length',
            str(len(raw))
        )

        self.end_headers()

        self.wfile.write(raw)


    def do_POST(self):

        try:

            length = int(
                self.headers.get(
                    'Content-Length',
                    '0'
                )
            )

            if length > 10000:

                return self.send_json(
                    413,
                    {
                        'error':
                        'Слишком большой запрос.'
                    }
                )

            payload = json.loads(
                self.rfile.read(length)
            )

            self.send_json(
                200,
                compute(payload)
            )

        except (
            ValueError,
            KeyError,
            OverflowError
        ) as e:

            self.send_json(
                400,
                {'error': str(e)}
            )

        except Exception:

            self.send_json(
                500,
                {
                    'error':
                    'Не удалось выполнить расчёт. '
                    'Проверьте данные и настройки сервиса.'
                }
            )

# =========================================
# ASTRODIALOGI — COSMOGRAM V2
# РАСЧЁТ БЕЗ ВРЕМЕНИ РОЖДЕНИЯ
# =========================================


def cosmogram_jd(dt):

    dt = dt.astimezone(timezone.utc)

    return swe.julday(
        dt.year,
        dt.month,
        dt.day,
        dt.hour
        + dt.minute / 60
        + dt.second / 3600
        + dt.microsecond / 3600000000
    )


def cosmogram_position(moment, planet):

    values, _ = swe.calc_ut(
        cosmogram_jd(moment),
        planet,
        swe.FLG_SWIEPH | swe.FLG_SPEED
    )

    longitude = values[0] % 360

    return {
        'longitude': longitude,
        'sign_index': int(longitude // 30),
        'speed': values[3]
    }


# =========================================
# ГРАНИЦЫ МЕСТНЫХ СУТОК
# =========================================

def cosmogram_day_boundary(naive, zone):

    # Учитываем неоднозначное или
    # несуществующее местное время.

    for minute in range(1441):

        moment = naive + timedelta(
            minutes=minute
        )

        valid = []

        for fold in (0, 1):

            aware = moment.replace(
                tzinfo=zone,
                fold=fold
            )

            utc = aware.astimezone(
                timezone.utc
            )

            restored = utc.astimezone(
                zone
            ).replace(tzinfo=None)

            if restored == moment:

                valid.append(utc)

        if valid:

            return min(valid)

    raise ValueError(
        'Не удалось определить границы '
        'местных суток рождения.'
    )


# =========================================
# ПОИСК МОМЕНТА СТАЦИОНАРНОСТИ
# =========================================

def cosmogram_station(left, right, planet):

    initial_speed = cosmogram_position(
        left,
        planet
    )['speed']

    initial_direction = initial_speed < 0

    while (
        right - left
    ).total_seconds() > 0.1:

        middle = left + (right - left) / 2

        speed = cosmogram_position(
            middle,
            planet
        )['speed']

        if (speed < 0) == initial_direction:

            left = middle

        else:

            right = middle

    return left + (right - left) / 2


# =========================================
# ПОИСК ТОЧНОГО МОМЕНТА ИНГРЕССИИ
# =========================================

def cosmogram_ingress(
    left,
    right,
    planet,
    initial_sign
):

    while (
        right - left
    ).total_seconds() > 0.1:

        middle = left + (right - left) / 2

        sign = cosmogram_position(
            middle,
            planet
        )['sign_index']

        if sign == initial_sign:

            left = middle

        else:

            right = middle

    return right


# =========================================
# ПОЛОЖЕНИЕ ПЛАНЕТЫ В ТЕЧЕНИЕ СУТОК
# =========================================

def cosmogram_planet(
    start,
    end,
    zone,
    planet
):

    moments = []

    current = start

    step = timedelta(minutes=15)

    while current < end:

        moments.append(current)

        current += step

    last_moment = end - timedelta(
        microseconds=1000
    )

    if last_moment > moments[-1]:

        moments.append(last_moment)


    # Проверяем положение и скорость
    # планеты в каждой точке.

    samples = [

        (
            moment,
            cosmogram_position(
                moment,
                planet
            )
        )

        for moment in moments

    ]


    # Добавляем точки стационарности,
    # чтобы обнаружить возможную смену
    # знака около разворота планеты.

    stations = []

    for i in range(len(samples) - 1):

        left, a = samples[i]

        right, b = samples[i + 1]

        if (
            (a['speed'] < 0)
            !=
            (b['speed'] < 0)
        ):

            station = cosmogram_station(
                left,
                right,
                planet
            )

            stations.append(station)


    moments = sorted(
        set(moments + stations)
    )

    samples = [

        (
            moment,
            cosmogram_position(
                moment,
                planet
            )
        )

        for moment in moments

    ]


    # Все возможные знаки
    # в хронологическом порядке.

    possible = []

    for _, p in samples:

        sign = SIGNS[p['sign_index']]

        if sign not in possible:

            possible.append(sign)


    # Определяем время каждой ингрессии.

    ingresses = []

    for i in range(len(samples) - 1):

        left, a = samples[i]

        right, b = samples[i + 1]

        if (
            a['sign_index']
            == b['sign_index']
        ):

            continue

        moment = cosmogram_ingress(
            left,
            right,
            planet,
            a['sign_index']
        )

        local = moment.astimezone(zone)

        after = cosmogram_position(
            moment,
            planet
        )

        ingresses.append({

            'from_sign':
                SIGNS[a['sign_index']],

            'to_sign':
                SIGNS[b['sign_index']],

            'local_time':
                local.strftime('%H:%M'),

            'local_datetime':
                local.isoformat(
                    timespec='seconds'
                ),

            'utc_datetime':
                moment.isoformat(
                    timespec='seconds'
                ),

            'retrograde':
                after['speed'] < 0

        })


    # Проверяем, менялось ли направление
    # движения планеты в течение суток.

    directions = list(

        dict.fromkeys(

            'retrograde'
            if p['speed'] < 0
            else 'direct'

            for _, p in samples

        )

    )

    return {

        'possible_signs': possible,

        'sign_uncertain':
            len(possible) > 1,

        'degree_approximate': True,

        'ingresses': ingresses,

        'motion_uncertain':
            len(directions) > 1,

        'possible_motion': directions

    }


# =========================================
# СОХРАНЯЕМ ПРЕЖНИЙ РАСЧЁТ
# НАТАЛЬНОЙ КАРТЫ
# =========================================

_compute_natal_original = compute


# =========================================
# УНИВЕРСАЛЬНЫЙ РАСЧЁТ
# НАТАЛЬНАЯ КАРТА И КОСМОГРАММА
# =========================================

def compute(data):

    # Если время известно,
    # используем прежний алгоритм.

    if data.get('time'):

        result = _compute_natal_original(
            data
        )

        result['chart_type'] = 'natal'

        return result


    # Если время неизвестно,
    # рассчитываем космограмму.

    date = datetime.strptime(
        str(data['date']),
        '%Y-%m-%d'
    )

    lat = float(data['lat'])

    lng = float(data['lng'])

    if not (
        -90 <= lat <= 90
        and
        -180 <= lng <= 180
    ):

        raise ValueError(
            'Некорректные координаты.'
        )

    zone = ZoneInfo(
        timezone_at(lat, lng)
    )


    # Начало и конец местных суток.

    start = cosmogram_day_boundary(
        date,
        zone
    )

    end = cosmogram_day_boundary(
        date + timedelta(days=1),
        zone
    )

    if end <= start:

        raise ValueError(
            'Указанная дата не существовала '
            'в данном часовом поясе.'
        )


    # Середина суток используется только
    # как приблизительное положение
    # для совместимости с интерфейсом.

    reference = start + (end - start) / 2

    jd = cosmogram_jd(reference)

    planets = []


    for name, number, glyph in PLANETS:

        approximate = position(
            jd,
            number
        )

        daily = cosmogram_planet(
            start,
            end,
            zone,
            number
        )

        item = {

            'name': name,

            'glyph': glyph,

            **approximate,

            **daily,

            'houses': {

                'placidus': None,

                'whole_sign': None,

                'equal': None

            },

            'placidus_house': None,

            'whole_sign_house': None,

            'equal_house': None

        }

        planets.append(item)


    return {

        'chart_type': 'cosmogram',

        'timezone': zone.key,

        'time_known': False,

        'planets': planets,

        'ascendant': None,

        'mc': None,

        'houses': None,

        'house_systems': None,

        'default_house_system': None,

        'aspects': [],

        'reference_time':

            reference.astimezone(
                zone
            ).isoformat(),

        'birth_date':
            date.strftime('%Y-%m-%d')

    }


# =========================================
# END — COSMOGRAM V2
# =========================================
