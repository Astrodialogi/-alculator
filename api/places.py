import json, os, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","public, max-age=300")
        self.send_header("Content-Length",str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        username = os.environ.get("GEONAMES_USERNAME")
        if not username:
            return self._send(500,{"error":"Поиск мест ещё не настроен: отсутствует GEONAMES_USERNAME."})

        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        q = (qs.get("q",[""])[0] or "").strip()
        if len(q) < 2:
            return self._send(200,{"places":[]})

        params = {
            "q": q,
            "maxRows": 8,
            "featureClass": "P",
            "orderby": "relevance",
            "lang": "ru",
            "style": "FULL",
            "username": username,
        }
        url = "https://secure.geonames.org/searchJSON?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"User-Agent":"AstrodialogiManifest/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return self._send(502,{"error":"Сервис поиска мест временно недоступен.","detail":str(e)})

        if "status" in data:
            return self._send(502,{"error":data["status"].get("message","Ошибка GeoNames")})

        out=[]
        for g in data.get("geonames",[]):
            out.append({
                "name": g.get("name") or g.get("toponymName"),
                "admin1": g.get("adminName1"),
                "country": g.get("countryName"),
                "countryCode": g.get("countryCode"),
                "lat": float(g["lat"]),
                "lng": float(g["lng"]),
                "geonameId": g.get("geonameId"),
            })
        self._send(200,{"places":out})
