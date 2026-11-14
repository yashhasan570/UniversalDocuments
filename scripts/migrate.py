#!/usr/bin/env python3
"""Reapply the Universal Documents rebrand after an upstream sync."""
from pathlib import Path
import os, shutil

SKIP = {'.git', '.github', 'docs', 'scripts'}

def sweep():
    pairs = [
        ('PAPERLESS_', 'UNIVERSALDOCUMENTS_'),
        ('PAPERLESS', 'UNIVERSALDOCUMENTS'),
        ('Paperless-ngx', 'Universal Documents'),
        ('Paperless', 'Universal'),
        ('PaperLess', 'Universal'),
        ('paperless-ngx', 'universaldocuments'),
        ('paperless', 'universaldocuments'),
    ]
    binary_ext = {'.png','.jpg','.jpeg','.gif','.ico','.webp','.pdf','.zip','.woff','.woff2','.ttf','.eot'}
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for f in files:
            p = Path(root) / f
            if p.suffix.lower() in binary_ext or p.name in ('migrate.py', 'README.md'): continue
            try: t = p.read_text(encoding='utf-8')
            except Exception: continue
            orig = t
            for old, new in pairs:
                t = t.replace(old, new)
            if t != orig: p.write_text(t)

def renames():
    targets = []
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for name in dirs + files:
            if 'paperless' in name.lower():
                targets.append(Path(root) / name)
    targets.sort(key=lambda p: len(p.parts), reverse=True)
    for p in targets:
        if not p.exists(): continue
        nf = p.name.replace('Paperless', 'UniversalDocuments').replace('paperless', 'universaldocuments')
        p.rename(p.parent / nf)

def cleanup():
    for item in ['AGENTS.md','CODEOWNERS','CODE_OF_CONDUCT.md','CONTRIBUTING.md','SECURITY.md','crowdin.yml',
                 'zensical.toml','docker/init-flow.md','src-ui/README.md','.devcontainer','.codecov.yml',
                 '.hadolint.yml','.mypy-baseline.txt','.pre-commit-config.yaml','.pyrefly-baseline.json','.tx']:
        p = Path(item)
        if p.is_dir(): shutil.rmtree(p, ignore_errors=True)
        elif p.exists(): p.unlink()

def readme():
    Path('README.md').write_text("""# Universal Documents

Self-hosted document management system. Scan, index and archive your paper documents with OCR, full-text search, automatic tagging and multi-user support.

## Build

```
uv sync
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python3 manage.py runserver
```

## Contact

Telegram: [@johnconstantine570](https://t.me/johnconstantine570)
""")

if __name__ == '__main__':
    sweep(); renames(); cleanup(); readme()
    print('rebrand reapplied')
