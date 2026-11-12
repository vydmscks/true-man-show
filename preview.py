from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import functools
import webbrowser

class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    address = 'http://127.0.0.1:4173/'
    handler = functools.partial(PreviewHandler, directory=str(Path(__file__).resolve().parent))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', 4173), handler)
    except OSError:
        print('Port 4173 is in use. Open ' + address)
        webbrowser.open(address)
    else:
        print('Preview: ' + address + '\nTiming editor: ' + address + 'timing.html\nCtrl+C to stop.', flush=True)
        webbrowser.open(address)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            server.server_close()
