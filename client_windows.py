import http.server
import json
import os
import re
import socketserver
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

REMOTE_URL = os.environ.get("REMOTE_SERVER", "http://192.168.16.132:8080").rstrip("/")
LOCAL_PORT = int(os.environ.get("PORT", "8080"))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PRINT_ROUTE_RE = re.compile(r"^/api/assets/([^/]+)/print-brother(?:\?.*)?$")
PRINT_BATCH_RE = re.compile(r"^/api/assets/print-brother-batch(?:\?.*)?$")


def build_label_fields(asset):
    brand = (asset.get("brand") or "").strip()
    model = (asset.get("model") or "").strip()
    category = (asset.get("category") or "").strip()
    asset_tag = (asset.get("asset_tag") or "").strip()
    serial = (asset.get("serial_number") or "").strip()

    if serial and serial.upper() not in ("NO LEGIBLE", "NA", "N/A"):
        top_text = serial
        barcode_value = serial
    else:
        top_text = f"{brand} {model}".strip() or category or asset_tag
        barcode_value = asset_tag

    return {
        "brandModel": top_text,
        "assetTag": asset_tag,
        "barcodeValue": barcode_value,
    }


def handle_local_brother_batch(handler, body_bytes):
    tmp_path = None
    try:
        parsed = urllib.parse.urlparse(handler.path)
        qs = urllib.parse.parse_qs(parsed.query)
        printer_name = qs.get("printer", ["Brother PT-D410"])[0]

        payload = json.loads((body_bytes or b"{}").decode("utf-8"))
        asset_ids = payload.get("asset_ids") or []
        if not asset_ids:
            send_json(handler, 400, {"error": "Lista asset_ids requerida"})
            return

        labels = []
        for aid in asset_ids:
            asset_url = f"{REMOTE_URL}/api/assets/{urllib.parse.quote(str(aid))}"
            with urllib.request.urlopen(asset_url, timeout=10) as resp:
                asset = json.loads(resp.read().decode("utf-8"))
                labels.append(build_label_fields(asset))

        script_path = os.path.join(BASE_DIR, "scripts", "print_label.ps1")
        template_path = os.path.join(BASE_DIR, "templates", "etiqueta.lbx")

        if not os.path.exists(script_path):
            send_json(handler, 500, {"error": "Script scripts/print_label.ps1 no encontrado."})
            return
        if not os.path.exists(template_path):
            send_json(handler, 404, {"error": "Plantilla templates/etiqueta.lbx no encontrada."})
            return

        with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False) as tf:
            json.dump(labels, tf, ensure_ascii=False)
            tmp_path = tf.name

        cmd = [
            "powershell",
            "-ExecutionPolicy", "Bypass",
            "-File", script_path,
            "-templatePath", template_path,
            "-printerName", printer_name,
            "-batchFile", tmp_path,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        output = (proc.stdout + "\n" + proc.stderr).strip()

        if proc.returncode != 0:
            send_json(handler, 500, {"error": f"Error al imprimir lote con b-PAC: {output}"})
            return

        send_json(handler, 200, {
            "status": "ok",
            "message": f"Lote de {len(labels)} etiquetas enviado a {printer_name}",
            "printer": printer_name,
            "count": len(labels),
            "details": output,
        })
    except Exception as e:
        send_json(handler, 500, {"error": str(e)})
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def handle_local_brother_print(handler, asset_id):
    try:
        parsed = urllib.parse.urlparse(handler.path)
        qs = urllib.parse.parse_qs(parsed.query)
        printer_name = qs.get("printer", ["Brother PT-D410"])[0]

        asset_url = f"{REMOTE_URL}/api/assets/{urllib.parse.quote(asset_id)}"
        with urllib.request.urlopen(asset_url, timeout=10) as resp:
            asset = json.loads(resp.read().decode("utf-8"))

        fields = build_label_fields(asset)
        brand_model = fields["brandModel"]
        asset_tag = fields["assetTag"]
        barcode_value = fields["barcodeValue"]

        script_path = os.path.join(BASE_DIR, "scripts", "print_label.ps1")
        template_path = os.path.join(BASE_DIR, "templates", "etiqueta.lbx")

        if not os.path.exists(script_path):
            send_json(handler, 500, {"error": "Script scripts/print_label.ps1 no encontrado."})
            return
        if not os.path.exists(template_path):
            send_json(handler, 404, {"error": "Plantilla templates/etiqueta.lbx no encontrada."})
            return

        cmd = [
            "powershell",
            "-ExecutionPolicy", "Bypass",
            "-File", script_path,
            "-templatePath", template_path,
            "-printerName", printer_name,
            "-brandModel", brand_model,
            "-assetTag", asset_tag,
            "-barcodeValue", barcode_value,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        output = (proc.stdout + "\n" + proc.stderr).strip()

        if proc.returncode != 0:
            send_json(handler, 500, {"error": f"Error al imprimir con b-PAC: {output}"})
            return

        send_json(handler, 200, {
            "status": "ok",
            "message": "Etiqueta enviada a impresora Brother PT-D410",
            "printer": printer_name,
            "asset_tag": asset_tag,
            "details": output,
        })
    except urllib.error.HTTPError as e:
        send_json(handler, e.code, {"error": f"Error consultando activo remoto: {e.reason}"})
    except Exception as e:
        send_json(handler, 500, {"error": str(e)})


def send_json(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class SatelliteProxyHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        print(f"[ITAM-CLIENT] {self.address_string()} - {format % args}")

    def _proxy(self):
        content_len = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(content_len) if content_len > 0 else None

        if self.command == "POST":
            if PRINT_BATCH_RE.match(self.path):
                handle_local_brother_batch(self, body)
                return
            m = PRINT_ROUTE_RE.match(self.path)
            if m:
                handle_local_brother_print(self, urllib.parse.unquote(m.group(1)))
                return

        target_url = f"{REMOTE_URL}{self.path}"

        req_headers = {}
        for k, v in self.headers.items():
            if k.lower() in ("host", "connection", "content-length", "accept-encoding"):
                continue
            req_headers[k] = v

        req = urllib.request.Request(target_url, data=body, headers=req_headers, method=self.command)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() in ("transfer-encoding", "connection", "content-length"):
                        continue
                    self.send_header(k, v)
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            err_body = e.read()
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() in ("transfer-encoding", "connection", "content-length"):
                    continue
                self.send_header(k, v)
            self.send_header("Content-Length", str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as e:
            send_json(self, 502, {"error": f"No se pudo conectar con la Raspberry Pi ({REMOTE_URL}): {e}"})

    def do_GET(self):
        self._proxy()

    def do_POST(self):
        self._proxy()

    def do_PUT(self):
        self._proxy()

    def do_DELETE(self):
        self._proxy()

    def do_OPTIONS(self):
        self._proxy()


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


if __name__ == "__main__":
    print(f"[ITAM-CLIENT] Iniciando cliente Windows en http://localhost:{LOCAL_PORT}")
    print(f"[ITAM-CLIENT] Conectado a base de datos remota en {REMOTE_URL}")
    print("[ITAM-CLIENT] Impresion Brother PT-D410 habilitada localmente.")
    server = ThreadingHTTPServer(("0.0.0.0", LOCAL_PORT), SatelliteProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ITAM-CLIENT] Cerrando...")
        server.server_close()
