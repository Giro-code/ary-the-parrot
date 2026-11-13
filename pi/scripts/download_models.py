"""Only two official, bounded downloads; never runs on import."""
import hashlib
import json
import shutil
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path('/home/ari/ary/models')
VOICE = 'es_MX-ald-medium.onnx'
BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/'


def download(url, path, limit):
    if path.exists():
        print('Existing:', path.name, path.stat().st_size, flush=True)
        return
    temp = path.with_suffix(path.suffix + '.part')
    with urllib.request.urlopen(url, timeout=60) as source, temp.open('wb') as output:
        total = 0
        while chunk := source.read(65536):
            total += len(chunk)
            if total > limit:
                raise ValueError('download_exceeds_limit')
            output.write(chunk)
    temp.replace(path)
    print(path.name, total, hashlib.sha256(path.read_bytes()).hexdigest(), flush=True)


if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    if shutil.disk_usage(ROOT).free < 500 * 1024**2:
        raise RuntimeError('need_500MB_free')
    download(BASE + VOICE, ROOT / VOICE, 80_000_000)
    download(BASE + VOICE + '.json', ROOT / (VOICE + '.json'), 1_000_000)
    download(BASE + 'MODEL_CARD', ROOT / 'PIPER_MODEL_CARD', 1_000_000)
    archive = ROOT / 'vosk-model-small-es-0.42.zip'
    download('https://alphacephei.com/vosk/models/' + archive.name, archive, 80_000_000)
    with zipfile.ZipFile(archive) as source:
        if sum(item.file_size for item in source.infolist()) > 150_000_000:
            raise ValueError('expanded_model_too_large')
        for item in source.infolist():
            target = (ROOT / item.filename).resolve()
            if not target.is_relative_to(ROOT.resolve()):
                raise ValueError('unsafe_archive')
        source.extractall(ROOT)
    print(json.dumps({'piper': VOICE, 'vosk': archive.stem}), flush=True)
