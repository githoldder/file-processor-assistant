import zlib, string, sys, os
try:
    from urllib.request import urlopen, Request
except ImportError:
    from urllib2 import urlopen, Request

PLANTUML_ALPHABET = string.digits + string.ascii_uppercase + string.ascii_lowercase + '-_'

def encode6bit(b):
    if b < 10: return chr(48 + b)
    b -= 10
    if b < 26: return chr(65 + b)
    b -= 26
    if b < 26: return chr(97 + b)
    b -= 26
    if b == 0: return '-'
    if b == 1: return '_'
    return '?'

def append3bytes(b1, b2, b3):
    c1 = b1 >> 2
    c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
    c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
    c4 = b3 & 0x3F
    return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4)

def encode_plantuml(text):
    compressed = zlib.compress(text.encode('utf-8'))[2:-4]
    encoded = ''
    i = 0
    while i < len(compressed):
        if i + 2 < len(compressed):
            encoded += append3bytes(compressed[i], compressed[i+1], compressed[i+2])
        elif i + 1 < len(compressed):
            encoded += append3bytes(compressed[i], compressed[i+1], 0)
        else:
            encoded += append3bytes(compressed[i], 0, 0)
        i += 3
    return encoded

def render(puml_path, png_path):
    with open(puml_path, 'r', encoding='utf-8') as f:
        text = f.read()
    encoded = encode_plantuml(text)
    url = 'http://www.plantuml.com/plantuml/png/' + encoded
    print(f"Fetching: {url[:100]}...")
    req = Request(url)
    resp = urlopen(req, timeout=30)
    data = resp.read()
    with open(png_path, 'wb') as f:
        f.write(data)
    size = os.path.getsize(png_path)
    print(f"Written {png_path} ({size} bytes)")
    return size

if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    results = {}
    for name in ['U03-status-flow', 'U04-dependency-structure']:
        puml = os.path.join(base, name + '.puml')
        png = os.path.join(base, name + '.png')
        try:
            size = render(puml, png)
            ok = size > 5000
            results[name] = f"{'SUCCESS' if ok else 'FAIL(too small)'} - {size} bytes"
        except Exception as e:
            results[name] = f"ERROR - {e}"
    for k, v in results.items():
        print(f"{k}: {v}")
