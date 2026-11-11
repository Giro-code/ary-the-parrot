"""Local-only photographic review, with no changes to the web application."""
import json, sys, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
root=Path(__file__).resolve().parents[2]
phase=sys.argv[1] if len(sys.argv)>1 else '10a2-pass1'
out=root/'docs/catalog/evidence'/phase
out.mkdir(parents=True,exist_ok=True)
if 'final' in phase:
    items=[(c['key'],{'image':im,'filename':im['sourceUrl'].split('File:')[-1]}) for c in json.loads((root/'data/catalog/candidates.json').read_text(encoding='utf8')) for im in c['images']]
else:
    items=list(json.loads((root/'data/catalog/stage10a2-new-media.json').read_text(encoding='utf8')).items())
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
manifest=[]
for start in range(0,len(items),20):
    canvas=Image.new('RGB',(1400,1180),'#eeeeee');draw=ImageDraw.Draw(canvas)
    for j,(key,m) in enumerate(items[start:start+20]):
        x,y=(j%4)*350,(j//4)*236
        p=root/'public'/m['image']['file'].lstrip('/')
        with Image.open(p) as im:
            preview=ImageOps.contain(im.convert('RGB'),(340,192));canvas.paste(preview,(x+(350-preview.width)//2,y+(192-preview.height)//2))
        draw.text((x+4,y+195),str(start+j+1)+' '+key[:37],font=font,fill='#111111')
        draw.text((x+4,y+214),m['filename'][:49],font=small,fill='#444444')
        manifest.append({'key':key,'file':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    canvas.save(out/f'sheet-{start//20+1:02}.jpg',quality=90)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print(str(out),len(items))
