"""Single Vercel Python entrypoint for the calculator and website."""
import json
import os
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler
from api.calculate import compute

ASSETS = {
    '/': ('text/html; charset=utf-8', '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff"><title>Узнай свой Асцендент — Астродиалоги</title><link rel="stylesheet" href="style.css"></head><body><main><header><a class="brand" href="/">АСТРОДИАЛОГИ</a><span>Бесплатный калькулятор</span></header><section class="hero"><p class="eyebrow">НАТАЛЬНАЯ КАРТА</p><h1>Узнай свой <em>Асцендент</em></h1><p>И выясни, по какому знаку смотреть астропрогнозы.</p></section><form id="form"><label>Дата рождения<input id="date" type="date" required></label><label>Время рождения<input id="time" type="time" value="12:00" required></label><label class="check"><input id="unknown" type="checkbox"> Не знаю время рождения</label><p id="timeHelp" class="hint" hidden>Без точного времени нельзя определить Асцендент и дома. Положения планет рассчитать можно; если Луна меняла знак в этот день, покажем оба варианта.</p><label>Город рождения<input id="city" type="search" autocomplete="off" placeholder="Начни вводить город…" required><span class="hint">Выбери город из списка, чтобы учесть координаты и часовой пояс.</span></label><div id="suggestions" role="listbox"></div><p id="selected" class="hint"></p><button type="submit" id="submit">Рассчитать Асцендент</button><p class="error" id="error" role="alert"></p></form><section id="result" hidden aria-live="polite"></section><footer>Расчёты: Swiss Ephemeris · Тропический зодиак · <a href="https://taplink.cc/alisa.astrologia">Консультации</a></footer></main><script src="app.js"></script></body></html>\n'),
    '/index.html': ('text/html; charset=utf-8', '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff"><title>Узнай свой Асцендент — Астродиалоги</title><link rel="stylesheet" href="style.css"></head><body><main><header><a class="brand" href="/">АСТРОДИАЛОГИ</a><span>Бесплатный калькулятор</span></header><section class="hero"><p class="eyebrow">НАТАЛЬНАЯ КАРТА</p><h1>Узнай свой <em>Асцендент</em></h1><p>И выясни, по какому знаку смотреть астропрогнозы.</p></section><form id="form"><label>Дата рождения<input id="date" type="date" required></label><label>Время рождения<input id="time" type="time" value="12:00" required></label><label class="check"><input id="unknown" type="checkbox"> Не знаю время рождения</label><p id="timeHelp" class="hint" hidden>Без точного времени нельзя определить Асцендент и дома. Положения планет рассчитать можно; если Луна меняла знак в этот день, покажем оба варианта.</p><label>Город рождения<input id="city" type="search" autocomplete="off" placeholder="Начни вводить город…" required><span class="hint">Выбери город из списка, чтобы учесть координаты и часовой пояс.</span></label><div id="suggestions" role="listbox"></div><p id="selected" class="hint"></p><button type="submit" id="submit">Рассчитать Асцендент</button><p class="error" id="error" role="alert"></p></form><section id="result" hidden aria-live="polite"></section><footer>Расчёты: Swiss Ephemeris · Тропический зодиак · <a href="https://taplink.cc/alisa.astrologia">Консультации</a></footer></main><script src="app.js"></script></body></html>\n'),
    '/style.css': ('text/css; charset=utf-8', ':root{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#171717;background:#fff;font-synthesis:none}*{box-sizing:border-box}body{margin:0}main{max-width:670px;margin:auto;padding:24px 22px 60px}header{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:#888}header .brand{font-weight:800;letter-spacing:.13em;color:#222;text-decoration:none}.hero{padding:64px 0 34px}.eyebrow{font-size:11px;letter-spacing:.18em;color:#ba648d;font-weight:750}.hero h1{font-size:clamp(38px,7vw,65px);letter-spacing:-.06em;line-height:1.08;margin:12px 0 16px}.hero em{font-style:normal;background:linear-gradient(transparent 63%,#f6c8df 63%)}.hero>p:last-child{color:#555;font-size:17px;line-height:1.5}form{display:grid;gap:18px}label:not(.check){display:grid;gap:9px;font-size:14px;font-weight:650}input[type=date],input[type=time],input[type=search]{border:1px solid #d9d9d9;border-radius:10px;padding:15px;font:inherit;font-weight:400;width:100%;background:#fff;color:#222;min-height:52px}.check{display:flex;align-items:center;gap:9px;font-size:14px}.check input{accent-color:#c96c9d;width:18px;height:18px}.hint{color:#777;font-size:12px;line-height:1.5;margin:0;font-weight:400}#timeHelp{padding:12px;background:#fdf1f7;border-radius:8px}button{background:#edbdd4;border:0;border-radius:11px;padding:17px 20px;font:inherit;font-weight:750;cursor:pointer}button:hover{background:#e6a6c5}button:disabled{opacity:.6;cursor:wait}#suggestions{display:grid;gap:3px;margin-top:-12px}#suggestions button{background:#fafafa;text-align:left;padding:12px;font-weight:500;border:1px solid #eee}#selected{color:#a14a75}.error{color:#a32243;font-size:13px;min-height:1em}#result{border-top:1px solid #eee;margin-top:35px;padding-top:28px}#result h2{font-size:29px;letter-spacing:-.04em}#result .symbol{font-size:44px;color:#c96c9d}.result-head{display:flex;gap:16px;align-items:center}.result-head h2{margin:4px 0}.result-head p{margin:0;color:#777}details{margin-top:24px;border-top:1px solid #eee;padding-top:18px}summary{font-weight:700;cursor:pointer}table{border-collapse:collapse;width:100%;margin-top:15px;font-size:14px}td{padding:12px 5px;border-bottom:1px solid #eee}td:last-child{text-align:right}small{color:#777}.note{background:#faf5f8;padding:15px;border-radius:9px;line-height:1.5;font-size:14px}footer{font-size:12px;color:#999;margin-top:70px}footer a{color:#b25884}@media(max-width:440px){.hero{padding-top:48px}main{padding-inline:18px}}\n'),
    '/app.js': ('application/javascript; charset=utf-8', 'const $=id=>document.getElementById(id);let place=null,timer=null;\nconst zodiac=[\'♈\',\'♉\',\'♊\',\'♋\',\'♌\',\'♍\',\'♎\',\'♏\',\'♐\',\'♑\',\'♒\',\'♓\'];\n$(\'unknown\').addEventListener(\'change\',()=>{const yes=$(\'unknown\').checked;$(\'time\').disabled=yes;$(\'time\').required=!yes;$(\'timeHelp\').hidden=!yes;$(\'submit\').textContent=yes?\'Рассчитать планеты\':\'Рассчитать Асцендент\'});\n$(\'city\').addEventListener(\'input\',()=>{place=null;$(\'selected\').textContent=\'\';clearTimeout(timer);const q=$(\'city\').value.trim();$(\'suggestions\').replaceChildren();if(q.length<2)return;timer=setTimeout(async()=>{try{const r=await fetch(\'/api/places?q=\'+encodeURIComponent(q));const data=await r.json();if(!r.ok)throw Error(data.error||\'Поиск города недоступен\');if($(\'city\').value.trim()!==q)return;for(const p of data.places||[]){const b=document.createElement(\'button\');b.type=\'button\';b.textContent=[p.name,p.admin1,p.country].filter(Boolean).join(\', \');b.addEventListener(\'click\',()=>{place=p;$(\'city\').value=b.textContent;$(\'selected\').textContent=\'Город выбран: \'+b.textContent;$(\'suggestions\').replaceChildren()});$(\'suggestions\').append(b)}}catch(e){$(\'error\').textContent=e.message}},350)});\nfunction fmt(p){return `${p.degree}° ${String(p.minute).padStart(2,\'0\')}′`}\nfunction escapeHTML(s){return String(s).replace(/[&<>"\']/g,c=>({\'&\':\'&amp;\',\'<\':\'&lt;\',\'>\':\'&gt;\',\'"\':\'&quot;\',"\'":\'&#39;\'}[c]))}\n$(\'form\').addEventListener(\'submit\',async e=>{e.preventDefault();$(\'error\').textContent=\'\';$(\'result\').hidden=true;if(!place){$(\'error\').textContent=\'Выбери город из выпадающего списка.\';return}const b=$(\'submit\');b.disabled=true;b.textContent=\'Рассчитываем…\';try{const r=await fetch(\'/api/calculate\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({date:$(\'date\').value,time:$(\'unknown\').checked?null:$(\'time\').value,lat:place.lat,lng:place.lng})});const data=await r.json();if(!r.ok)throw Error(data.error||\'Ошибка расчёта\');const root=$(\'result\');const asc=data.ascendant;let html=asc?`<div class="result-head"><div class="symbol">${zodiac[asc.sign_index]}</div><div><small>ТВОЙ АСЦЕНДЕНТ</small><h2>${escapeHTML(asc.sign)}</h2><p>${fmt(asc)} ${escapeHTML(asc.sign)}</p></div></div><p class="note">Для ежемесячных прогнозов по Асценденту выбирай знак <b>${escapeHTML(asc.sign)}</b>.</p>`:`<h2>Твои планеты</h2><p class="note">Время рождения неизвестно: Асцендент и дома не рассчитаны. Если планета могла сменить знак за день, показаны возможные варианты.</p>`;\nhtml+=\'<details \'+(!asc?\'open\':\'\')+\'><summary>Посмотреть положения всех планет</summary><table><tbody>\';\nfor(const p of data.planets){const sign=p.sign_uncertain?p.possible_signs.join(\' / \'):p.sign;const degree=data.time_known?\' · \'+fmt(p):\'\';const house=data.time_known?\' · \'+p.whole_sign_house+\' дом (Whole Sign)\':\'\';html+=`<tr><td>${p.glyph} ${escapeHTML(p.name)}</td><td>${escapeHTML(sign)}${degree}${p.retrograde?\' ℞\':\'\'}${house}${p.sign_uncertain?\' ⚠️\':\'\'}</td></tr>`}\nhtml+=\'</tbody></table>\';if(!data.time_known)html+=\'<p class="hint">Без времени рождения градусы не указываются. Знаки проверены на протяжении местных суток.</p>\';html+=\'</details>\';if(asc)html+=\'<details><summary>Технические данные</summary><p>MC: \'+escapeHTML(data.mc.sign)+\' \'+fmt(data.mc)+\'</p><p>Система домов для таблицы: Whole Sign. Расчёт куспидов Плацидуса доступен в вычислительном модуле.</p></details>\';html+=\'<p><a href="https://taplink.cc/alisa.astrologia">Персональные консультации →</a></p>\';root.innerHTML=html;root.hidden=false;root.scrollIntoView({behavior:\'smooth\',block:\'start\'});\n}catch(err){$(\'error\').textContent=err.message}finally{b.disabled=false;b.textContent=$(\'unknown\').checked?\'Рассчитать планеты\':\'Рассчитать Асцендент\'}});\n'),
}

class handler(BaseHTTPRequestHandler):
    def respond(self, code, content, content_type='application/json; charset=utf-8'):
        raw = content.encode('utf-8') if isinstance(content, str) else content
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def json(self, code, value):
        self.respond(code, json.dumps(value, ensure_ascii=False))

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path
        if path in ASSETS:
            content_type, content = ASSETS[path]
            return self.respond(200, content, content_type)
        if path != '/api/places':
            return self.json(404, {'error': 'Страница не найдена'})
        username = os.environ.get('GEONAMES_USERNAME')
        if not username:
            return self.json(500, {'error': 'Не настроен GEONAMES_USERNAME в Vercel.'})
        q = (urllib.parse.parse_qs(parsed.query).get('q', [''])[0] or '').strip()
        if len(q) < 2:
            return self.json(200, {'places': []})
        params = urllib.parse.urlencode({'q': q, 'maxRows': 8, 'featureClass': 'P', 'orderby': 'relevance', 'lang': 'ru', 'style': 'FULL', 'username': username})
        try:
            req = urllib.request.Request('https://secure.geonames.org/searchJSON?' + params, headers={'User-Agent': 'AstrodialogiCalculator/1.0'})
            with urllib.request.urlopen(req, timeout=8) as response:
                data = json.load(response)
            if 'status' in data:
                return self.json(502, {'error': data['status'].get('message', 'Ошибка GeoNames')})
            places = [{'name': g.get('name') or g.get('toponymName'), 'admin1': g.get('adminName1'), 'country': g.get('countryName'), 'countryCode': g.get('countryCode'), 'lat': float(g['lat']), 'lng': float(g['lng']), 'geonameId': g.get('geonameId')} for g in data.get('geonames', [])]
            self.json(200, {'places': places})
        except Exception:
            self.json(502, {'error': 'Сервис поиска городов временно недоступен.'})

    def do_POST(self):
        if urllib.parse.urlsplit(self.path).path != '/api/calculate':
            return self.json(404, {'error': 'Неизвестный адрес API'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 1 or length > 10000:
                return self.json(413, {'error': 'Некорректный размер запроса'})
            payload = json.loads(self.rfile.read(length))
            self.json(200, compute(payload))
        except (ValueError, KeyError, OverflowError) as exc:
            self.json(400, {'error': str(exc)})
        except Exception:
            self.json(500, {'error': 'Не удалось выполнить расчёт. Проверьте данные и настройки сервиса.'})
