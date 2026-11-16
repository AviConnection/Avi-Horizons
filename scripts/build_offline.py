#!/usr/bin/env python3
"""Bundle this buildless game into a file:// playable zip, using stdlib only."""
import argparse
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = re.compile(r"^import\s+(.*?)\s+from\s+['\"]\./([^'\"]+)['\"];?\s*$", re.M)
EXPORT = re.compile(r"^export\s+(?:const|let|function|class)\s+(\w+)", re.M)

def bundle():
    seen, parts = set(), ['const __AVI = Object.create(null);']
    def visit(name):
        if name in seen: return
        seen.add(name)
        source = (ROOT / 'dist' / name).read_text()
        imports = list(IMPORT.finditer(source))
        for match in imports: visit(match[2])
        bindings = []
        for match in imports:
            binding, dep = match[1], match[2]
            if binding.startswith('* as '): binding = binding[5:]
            else: binding = re.sub(r'\bas\b', ':', binding)
            bindings.append(f'const {binding} = __AVI["{dep}"];')
        exported = EXPORT.findall(source)
        source = IMPORT.sub('', source)
        source = re.sub(r'^export\s+', '', source, flags=re.M)
        parts.append(f'__AVI["{name}"] = (() => {{\n' + '\n'.join(bindings) + '\n' + source + '\nreturn {' + ','.join(exported) + '};\n})();')
    visit('app.js')
    return '\n'.join(parts)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        game = Path(tmp) / 'AVI_HORIZONS'
        source = game / 'dist'
        shutil.copytree(ROOT / 'dist', source, ignore=shutil.ignore_patterns('descargas'))
        (source / 'app.bundle.js').write_text(bundle())
        subprocess.run(['node', '--check', str(source / 'app.bundle.js')], check=True)
        html = (source / 'index.html').read_text().replace('<script type="module" src="app.js"></script>', '<script src="app.bundle.js"></script>')
        if 'type="module"' in html: raise RuntimeError('Module script not replaced')
        html = re.sub(r'<a class="menu-link game-download".*?</a>', '', html, flags=re.S)
        (source / 'JUGAR.html').write_text(html)
        (game / 'JUGAR.html').write_text(html.replace('<head>', '<head>\n  <base href="dist/">', 1))
        shutil.copy(ROOT / 'README.md', game / 'README.md')
        (game / 'LEEME.txt').write_text('AVI HORIZONS: ECOS DEL TIEMPO — AVI CONNECTION\n\n1. Extrae toda la carpeta del ZIP.\n2. Abre JUGAR.html en Chrome o Edge en una computadora.\n3. Espera cinco segundos a que aparezca el menú.\n4. Elige INICIAR JUEGO o PROBAR FARO 7.\n\nNo necesitas instalar programas ni usar internet. Conserva la carpeta dist junto a JUGAR.html.\nCódigo HTML/CSS/JS incluido en dist. Los enlaces científicos requieren internet.\nINICIAR JUEGO abre el modo historia con Alex. EXPLORAR CAMPAÑA da acceso a 25 niveles en cinco misiones.\n')
        for folder in ['docs','tests','scripts']: shutil.copytree(ROOT / folder, game / folder)
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
            for path in game.rglob('*'):
                if path.is_file(): archive.write(path, path.relative_to(Path(tmp)))
    print(output)

if __name__ == '__main__': main()
