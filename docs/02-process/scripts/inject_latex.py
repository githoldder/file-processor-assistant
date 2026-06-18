import os
import re
import urllib.request
import zlib
import shutil

TXT_DIR = '/Users/caolei/Desktop/culcloud platform/docs/02-process/document/report-txt/chapters'
TEX_DIR = '/Users/caolei/Desktop/culcloud platform/docs/02-process/document/latex/cit-template/data'
FIG_DIR = '/Users/caolei/Desktop/culcloud platform/docs/02-process/document/latex/cit-template/figures'
UML_DIR = '/Users/caolei/Desktop/culcloud platform/docs/02-process/Figure/uml-sources'

def encode_puml(puml_code):
    compressor = zlib.compressobj(zlib.Z_DEFAULT_COMPRESSION, zlib.DEFLATED, -15)
    compressed_data = compressor.compress(puml_code.encode('utf-8')) + compressor.flush()
    out = []
    i = 0
    n = len(compressed_data)
    while i < n:
        b1 = compressed_data[i]
        b2 = compressed_data[i+1] if i+1 < n else 0
        b3 = compressed_data[i+2] if i+2 < n else 0
        c1 = b1 >> 2
        c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
        c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
        c4 = b3 & 0x3F
        out.append(c1)
        out.append(c2)
        if i+1 < n:
            out.append(c3)
        if i+2 < n:
            out.append(c4)
        i += 3
    puml_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
    return "".join(puml_chars[v] for v in out)

def download_image(url, output_png):
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        with urllib.request.urlopen(req, timeout=10) as response:
            with open(output_png, 'wb') as out_file:
                out_file.write(response.read())
        print(f"Downloaded: {output_png} from {url}")
    except Exception as e:
        print(f"Failed to download from {url}: {e}")
        shutil.copy(os.path.join(FIG_DIR, 'logo.png'), output_png)
        print(f"Fallback to logo.png for {output_png}")

def download_and_convert_svg(slug, color, output_png):
    svg_path = output_png.replace('.png', '.svg')
    url = f"https://cdn.simpleicons.org/{slug}/{color}"
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        with urllib.request.urlopen(req, timeout=10) as response:
            with open(svg_path, 'wb') as out_file:
                out_file.write(response.read())
        
        cmd = f"/opt/homebrew/bin/rsvg-convert -w 480 -h 480 {svg_path} -o {output_png}"
        os.system(cmd)
        print(f"Downloaded and converted SVG: {output_png}")
        if os.path.exists(svg_path):
            os.remove(svg_path)
    except Exception as e:
        print(f"Failed to download/convert SVG for {slug}: {e}")
        shutil.copy(os.path.join(FIG_DIR, 'logo.png'), output_png)

def download_puml_image(puml_path, output_png):
    try:
        with open(puml_path, 'r', encoding='utf-8') as f:
            code = f.read()
        encoded = encode_puml(code)
        url = f"http://www.plantuml.com/plantuml/png/{encoded}"
        download_image(url, output_png)
    except Exception as e:
        print(f"Failed to compile PUML {puml_path}: {e}")
        shutil.copy(os.path.join(FIG_DIR, 'logo.png'), output_png)

def escape_latex(text):
    text = text.replace('\\', '\\textbackslash{}')
    text = text.replace('%', '\\%')
    text = text.replace('&', '\\&')
    text = text.replace('$', '\\$')
    text = text.replace('#', '\\#')
    text = text.replace('{', '\\{')
    text = text.replace('}', '\\}')
    text = text.replace('_', '\\_')
    return text

def parse_placeholder(line):
    s_match = re.match(r'^\[截图占位符:\s*(S\d+)-([^\]]+)\]$', line.strip())
    if s_match:
        sid = s_match.group(1)
        name = s_match.group(2)
        mapping = {
            'S01': 'S01-pm2-status-real.png',
            'S02': 'S02-nacos-services-real.png',
            'S03': 'S03-gateway-route-real.png',
            'S04': 'S04-feign-call-real.png',
            'S05': 'S05-rabbitmq-bindings-real.png',
            'S06': 'S06-websocket-frames-real.png',
            'S07': 'S07-mp-checkout.png',
            'S08': 'S08-mock-pay-success-real.png',
            'S09': 'S09-admin-notification-real.png',
            'S10': 'S10-dashboard-real.png',
            'S11': 'S11-newman-cli-real.png',
            'S12': 'S12-playwright-cli-real.png',
            'S13': 'S13-brand-login-minio-real.png',
            'S21': 'S21-springboot.png',
            'S22': 'S22-nacos.png',
            'S23': 'S23-rabbitmq.png',
            'S24': 'S24-redis.png',
            'S25': 'S25-minio.png',
            'S26': 'S26-vue.png',
        }
        filename = mapping.get(sid, 'logo.png')
        width = "0.2" if sid in ['S21', 'S22', 'S23', 'S24', 'S25', 'S26'] else "0.9"
        return f"""\\begin{{figure}}[htbp]
  \\centering
  \\includegraphics[width={width}\\textwidth]{{figures/{filename}}}
  \\caption{{{escape_latex(name)}}}
  \\label{{fig:{sid}}}
\\end{{figure}}
"""
    u_match = re.match(r'^\[工程图占位符:\s*(U\d+)-([^\]]+)\]$', line.strip())
    if u_match:
        uid = u_match.group(1)
        name = u_match.group(2)
        mapping = {
            'U01': 'U01-system-architecture.png',
            'U02': 'U02-pay-notice-sequence.png',
            'U03': 'U03-status-flow.png',
            'U04': 'U04-dependency-structure.png',
        }
        filename = mapping.get(uid, 'logo.png')
        return f"""\\begin{{figure}}[htbp]
  \\centering
  \\includegraphics[width=0.9\\textwidth]{{figures/{filename}}}
  \\caption{{{escape_latex(name)}}}
  \\label{{fig:{uid}}}
\\end{{figure}}
"""
    return None

def process_chapter(filename, output_name):
    input_path = os.path.join(TXT_DIR, filename)
    output_path = os.path.join(TEX_DIR, output_name)
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    out = ["% !TeX root = ../thuthesis-example.tex\n"]
    
    for line in lines:
        if line.strip().startswith('====='):
            continue
        if not line.strip():
            out.append('\n')
            continue
        
        pl = parse_placeholder(line)
        if pl:
            out.append(pl)
            continue
            
        chap_match = re.match(r'^第\s*(\d+)\s*章\s+(.+)$', line.strip())
        if chap_match:
            out.append(f"\\chapter{{{escape_latex(chap_match.group(2))}}}\n")
            continue
            
        sec_match = re.match(r'^(\d+\.\d+)\s+(.+)$', line.strip())
        if sec_match:
            out.append(f"\\section{{{escape_latex(sec_match.group(2))}}}\n")
            continue
            
        subsec_match = re.match(r'^(\d+\.\d+\.\d+)\s+(.+)$', line.strip())
        if subsec_match:
            out.append(f"\\subsection{{{escape_latex(subsec_match.group(2))}}}\n")
            continue
            
        out.append(f"{escape_latex(line.strip())}\n")
        
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(out)
    print(f"Generated {output_path}")

def process_abstract():
    with open(os.path.join(TXT_DIR, '00-front-matter.txt'), 'r', encoding='utf-8') as f:
        content = f.read()
    
    parts = content.split('========================================================================')
    
    cn_part = parts[2].strip()
    en_part = parts[3].strip() if len(parts) > 3 else ""
    
    # Chinese Abstract
    cn_lines = cn_part.split('\n')
    cn_lines = [l.strip() for l in cn_lines if l.strip() and l.strip() != "摘 要"]
    cn_abstract_lines = []
    cn_keywords = ""
    for line in cn_lines:
        if "关键词：" in line:
            cn_keywords = line.split("关键词：")[1].strip()
        else:
            cn_abstract_lines.append(line)
    cn_abstract = "\n\n".join(cn_abstract_lines)
    
    # English Abstract
    en_lines = en_part.split('\n')
    en_lines = [l.strip() for l in en_lines if l.strip() and l.strip() != "Abstract"]
    en_abstract_lines = []
    en_keywords = ""
    for line in en_lines:
        if "Keywords:" in line:
            en_keywords = line.split("Keywords:")[1].strip()
        else:
            en_abstract_lines.append(line)
    en_abstract = "\n\n".join(en_abstract_lines)
    
    tex_content = f"""% !TeX root = ../thuthesis-example.tex

\\clearpage
\\thispagestyle{{abstractcn}}
\\addcontentsline{{toc}}{{chapter}}{{摘 要}}

\\vspace*{{1.15cm}}

\\begin{{center}}
  {{\\heiti\\bfseries\\zihao{{3}} 摘\\quad 要\\par}}
\\end{{center}}

\\vspace{{0.25cm}}

{{\\songti\\zihao{{-4}}\\setlength{{\\parindent}}{{2em}}\\linespread{{1.65}}\\selectfont
{escape_latex(cn_abstract)}

\\vspace{{0.65cm}}
\\noindent{{\\heiti 关键词：}}{escape_latex(cn_keywords)}
\\par}}

\\clearpage
\\thispagestyle{{abstracten}}
\\addcontentsline{{toc}}{{chapter}}{{Abstract}}

\\vspace*{{0.9cm}}

\\begin{{center}}
  {{\\rmfamily\\bfseries\\zihao{{3}} Abstract\\par}}
\\end{{center}}

\\vspace{{0.15cm}}

{{\\rmfamily\\zihao{{-4}}\\setlength{{\\parindent}}{{2em}}\\linespread{{1.45}}\\selectfont
{escape_latex(en_abstract)}

\\vspace{{0.45cm}}
\\noindent{{\\bfseries Keywords:}} {escape_latex(en_keywords)}
\\par}}
"""
    with open(os.path.join(TEX_DIR, 'abstract.tex'), 'w', encoding='utf-8') as f:
        f.write(tex_content)
    print("Generated abstract.tex")

def main():
    if not os.path.exists(TEX_DIR):
        os.makedirs(TEX_DIR)
        
    # Download PUML images
    download_puml_image(os.path.join(UML_DIR, '01-system-architecture.puml'), os.path.join(FIG_DIR, 'U01-system-architecture.png'))
    download_puml_image(os.path.join(UML_DIR, '03-pay-notice-sequence.puml'), os.path.join(FIG_DIR, 'U02-pay-notice-sequence.png'))
    
    # Download and convert Brand Logos
    download_and_convert_svg("springboot", "6DB33F", os.path.join(FIG_DIR, 'S21-springboot.png'))
    download_and_convert_svg("alibabacloud", "FF6A00", os.path.join(FIG_DIR, 'S22-nacos.png'))
    download_and_convert_svg("rabbitmq", "FF6600", os.path.join(FIG_DIR, 'S23-rabbitmq.png'))
    download_and_convert_svg("redis", "DC382D", os.path.join(FIG_DIR, 'S24-redis.png'))
    download_and_convert_svg("minio", "C72C48", os.path.join(FIG_DIR, 'S25-minio.png'))
    download_and_convert_svg("vuedotjs", "4FC08D", os.path.join(FIG_DIR, 'S26-vue.png'))

    # Copy fallback placeholders for U03 and U04
    shutil.copy(os.path.join(FIG_DIR, 'logo.png'), os.path.join(FIG_DIR, 'U03-status-flow.png'))
    shutil.copy(os.path.join(FIG_DIR, 'logo.png'), os.path.join(FIG_DIR, 'U04-dependency-structure.png'))
    
    # Process Chapters
    process_chapter('01-introduction.txt', 'chap01.tex')
    process_chapter('02-technology-overview.txt', 'chap02.tex')
    process_chapter('03-analysis-design.txt', 'chap03.tex')
    process_chapter('04-implementation.txt', 'chap04.tex')
    process_chapter('05-testing.txt', 'chap05.tex')
    process_chapter('06-summary.txt', 'chap06.tex')
    
    process_abstract()

if __name__ == '__main__':
    main()
