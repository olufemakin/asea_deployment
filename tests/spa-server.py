"""Local stand-in for Netlify's SPA fallback (netlify.toml: /* -> /index.html 200).
Serves real files; any other path returns index.html. Usage: python3 tests/spa-server.py 4556"""
import http.server, os, sys
class H(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path):
            self.path = "/index.html"
        return super().send_head()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(("", int(sys.argv[1]) if len(sys.argv) > 1 else 4556), H).serve_forever()
