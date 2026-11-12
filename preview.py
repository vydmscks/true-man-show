from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import functools
import webbrowser
import re

class PreviewHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.remaining = None
        path = Path(self.translate_path(self.path))
        requested = self.headers.get('Range')
        if not requested or not path.is_file():
            return super().send_head()
        size = path.stat().st_size
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested.strip())
        if not match or not any(match.groups()):
            return super().send_head()
        first, last = match.groups()
        start = int(first) if first else max(0, size - int(last))
        end = min(int(last), size - 1) if first and last else size - 1
        if start > end or start >= size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        source = path.open('rb')
        source.seek(start)
        self.remaining = end - start + 1
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(self.remaining))
        self.end_headers()
        return source

    def copyfile(self, source, outputfile):
        if self.remaining is None:
            return super().copyfile(source, outputfile)
        while self.remaining > 0:
            data = source.read(min(64 * 1024, self.remaining))
            if not data:
                break
            outputfile.write(data)
            self.remaining -= len(data)

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
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
