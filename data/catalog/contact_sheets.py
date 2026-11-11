"""Render local catalog photographs for a recorded visual inspection; no network."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json, sys

root = Path(__file__).resolve().parents[2]
phase = sys.argv[1] if len(sys.argv) > 1 else 'pass1'
target = root / 'docs' / 'catalog' / 'evidence' / phase
target.mkdir(parents=True, exist_ok=True)
records = json.loads((root / 'data/catalog/evidence/media.json').read_text(encoding='utf-8'))
catalog = json.loads((root / 'data/catalog/candidates.json').read_text(encoding='utf-8'))
font_path = Path('C:/Windows/Fonts/arial.ttf')
font = ImageFont.truetype(str(font_path), 15) if font_path.exists() else ImageFont.load_default()
small = ImageFont.truetype(str(font_path), 12) if font_path.exists() else ImageFont.load_default()
items = [(c['key'], records[c['key']]) for c in catalog if c['key'] in records]
if len(sys.argv) > 2 and sys.argv[2] == 'changes':
    selected = set(json.loads((root / 'data/catalog/photo-review.json').read_text(encoding='utf-8')))
    selected.update(x['key'] for x in json.loads((root / 'data/catalog/evidence/photo-replacements.json').read_text(encoding='utf-8')))
    selected.update(['cigua-palmera', 'dunas-de-bani', 'luperon', 'feria-internacional-del-libro-de-santo-domingo'])
    items = [(k,m) for k,m in items if k in selected]
for start in range(0, len(items), 20):
    sheet = Image.new('RGB', (1400, 1180), '#eeeef1')
    draw = ImageDraw.Draw(sheet)
    for i, (key, media) in enumerate(items[start:start+20]):
        col, row = i % 4, i // 4
        x, y = col * 350, row * 236
        file = root / 'public' / media['image']['file'].lstrip('/')
        with Image.open(file) as photo:
            preview = ImageOps.contain(photo.convert('RGB'), (340, 192))
            sheet.paste(preview, (x + (350-preview.width)//2, y + (192-preview.height)//2))
        draw.text((x+6, y+195), f'{start+i+1:03d} {key[:39]}', font=font, fill='#111111')
        draw.text((x+6, y+214), media['filename'][:49], font=small, fill='#444444')
    output = target / f'sheet-{start//20+1:02d}.jpg'
    sheet.save(output, quality=90)
    print(str(output))
(target/'manifest.json').write_text(json.dumps([{'index':i+1,'key':key,'filename':m['filename'],'sha256':m['sha256']} for i,(key,m) in enumerate(items)],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
