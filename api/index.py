
"""Single Vercel Python entrypoint for Astrodialogi calculators."""

import json
import os
import urllib.parse
import urllib.request
from pathlib import Path
from http.server import BaseHTTPRequestHandler

from api.calculate import compute


ROOT = Path(__file__).resolve().parent.parent


# Website pages
PAGES = {
    "/",
    "/index.html",
    "/natal",
    "/ascendant",
    "/sun",
    "/moon",
    "/mercury",
    "/venus",
    "/mars",
    "/jupiter",
    "/saturn",
    "/uranus",
    "/neptune",
    "/pluto",
    "/mc",
}


# Shared website assets
ASSETS = {
    "/style.css": (
        "text/css; charset=utf-8",
        "style.css"
    ),
    "/app.js": (
        "application/javascript; charset=utf-8",
        "app.js"
    ),
    "/interpretations.js": (
        "application/javascript; charset=utf-8",
        "interpretations.js"
    ),
}


class handler(BaseHTTPRequestHandler):

    def respond(
        self,
        code,
        content,
        content_type="application/json; charset=utf-8"
    ):
        raw = (
            content.encode("utf-8")
            if isinstance(content, str)
            else content
        )

        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def json(self, code, value):
        self.respond(
            code,
            json.dumps(value, ensure_ascii=False)
        )

    def serve_file(self, filename, content_type):

        filepath = ROOT / filename

        try:
            content = filepath.read_bytes()

        except OSError:
            return self.json(404, {
                "error": "Файл сайта не найден"
            })

        return self.respond(
            200,
            content,
            content_type
        )

    def do_GET(self):

        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path.rstrip("/") or "/"

        # All calculator pages use the same HTML.
        if path in PAGES:
            return self.serve_file(
                "index.html",
                "text/html; charset=utf-8"
            )

        # Shared CSS and JavaScript.
        if path in ASSETS:
            content_type, filename = ASSETS[path]

            return self.serve_file(
                filename,
                content_type
            )

        # Search for birth cities using GeoNames.
        if path != "/api/places":
            return self.json(404, {
                "error": "Страница не найдена"
            })

        username = os.environ.get("GEONAMES_USERNAME")

        if not username:
            return self.json(500, {
                "error": "Не настроен GEONAMES_USERNAME в Vercel."
            })

        q = (
            urllib.parse.parse_qs(parsed.query)
            .get("q", [""])[0] or ""
        ).strip()

        if len(q) < 2:
            return self.json(200, {"places": []})

        params = urllib.parse.urlencode({
            "q": q,
            "maxRows": 8,
            "featureClass": "P",
            "orderby": "relevance",
            "lang": "ru",
            "style": "FULL",
            "username": username,
        })

        try:

            url = (
                "https://secure.geonames.org/searchJSON?"
                + params
            )

            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "AstrodialogiCalculator/1.0"
                }
            )

            with urllib.request.urlopen(
                req,
                timeout=8
            ) as response:
                data = json.load(response)

            if "status" in data:
                return self.json(502, {
                    "error": data["status"].get(
                        "message",
                        "Ошибка GeoNames"
                    )
                })

            places = []

            for g in data.get("geonames", []):
                places.append({
                    "name": (
                        g.get("name")
                        or g.get("toponymName")
                    ),
                    "admin1": g.get("adminName1"),
                    "country": g.get("countryName"),
                    "countryCode": g.get("countryCode"),
                    "lat": float(g["lat"]),
                    "lng": float(g["lng"]),
                    "geonameId": g.get("geonameId"),
                })

            return self.json(200, {
                "places": places
            })

        except Exception:
            return self.json(502, {
                "error": (
                    "Сервис поиска городов "
                    "временно недоступен."
                )
            })

    def do_POST(self):

        path = (
            urllib.parse.urlsplit(self.path)
            .path.rstrip("/")
        )

        if path != "/api/calculate":
            return self.json(404, {
                "error": "Неизвестный адрес API"
            })

        try:

            length = int(
                self.headers.get("Content-Length", "0")
            )

            if length < 1 or length > 10000:
                return self.json(413, {
                    "error": "Некорректный размер запроса"
                })

            payload = json.loads(
                self.rfile.read(length)
            )

            result = compute(payload)

            return self.json(200, result)

        except (ValueError, KeyError, OverflowError) as exc:
            return self.json(400, {
                "error": str(exc)
            })

        except Exception:
            return self.json(500, {
                "error": (
                    "Не удалось выполнить расчёт. "
                    "Проверьте данные и настройки сервиса."
                )
            })
