# Activa la Raspberry (ssh ari) como kiosco de arytheparrot.app para el modo con IA de Ari sin pantalla.
# La credencial va directo de la base de datos a la Pi; no se muestra en pantalla.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$env:NODE_ENV = 'production'
$credential = node --env-file=.env.production.local --import tsx scripts/activate-pi-kiosk.ts
if ($LASTEXITCODE -ne 0 -or -not $credential) { throw 'No se pudo crear el kiosco (revisa .env.production.local)' }
$credential | ssh -o BatchMode=yes ari 'umask 077; cat > ~/ary/kiosk-device.json && echo "Pi activada como kiosco: el modo con IA ya puede usarse."'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar la credencial a la Pi' }
