param([string]$Source = '.cache/voice-assets', [switch]$Execute)
$ErrorActionPreference = 'Stop'
$assetRoot = (Resolve-Path -LiteralPath $Source).Path
if (-not (Test-Path -LiteralPath (Join-Path $assetRoot 'catalog.json'))) { throw 'Falta catalog.json' }
Write-Output 'Destino: ari:/home/ari/ary. Solo catalog.json y voice-cache/*.wav; no servicios ni firmware.'
if (-not $Execute) { Write-Output 'DRY-RUN: no se ha conectado ni copiado nada.'; return }
ssh -o BatchMode=yes ari 'mkdir -p /home/ari/ary/voice-cache; chmod 700 /home/ari/ary/voice-cache'
if ($LASTEXITCODE -ne 0) { throw 'SSH falló' }
scp -o BatchMode=yes (Join-Path $assetRoot 'catalog.json') 'ari:/home/ari/ary/catalog.json'
if ($LASTEXITCODE -ne 0) { throw 'La copia del catálogo falló' }
$cacheRoot = Join-Path $assetRoot 'voice-cache'
if (Test-Path -LiteralPath $cacheRoot) {
    foreach ($audio in Get-ChildItem -LiteralPath $cacheRoot -Filter '*.wav' -File) {
        if ($audio.Name -notmatch '^[a-f0-9]{64}\.wav$') { throw 'Nombre de caché inválido' }
        scp -o BatchMode=yes $audio.FullName 'ari:/home/ari/ary/voice-cache/'
        if ($LASTEXITCODE -ne 0) { throw 'La copia de audio falló' }
    }
}
Write-Output 'Copia terminada. Reiniciar manualmente voice para cargar el catálogo nuevo.'
