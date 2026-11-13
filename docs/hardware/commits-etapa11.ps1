# Preparado para una terminal con escritura autorizada en .git. No hace push.
# El entorno Codex de esta etapa recibió Permission denied al crear index.lock.
param([switch]$Execute)
$ErrorActionPreference = 'Stop'
if (-not $Execute) { Write-Output 'DRY-RUN: tres commits locales por fase; nada ejecutado. Revisar con git diff.'; return }
Set-Location -LiteralPath 'D:\Ary The Parrot'
if ((git diff --cached --name-only)) { throw 'Hay cambios ya staged: revisar primero para no incluir trabajo ajeno.' }
function Commit-Phase([string[]]$Files, [string]$Title) {
    git add -- $Files
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el commit' }
    git commit -m $Title -m 'Co-Authored-By: Codex <noreply@openai.com>'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el commit' }
}
Commit-Phase -Title 'Etapa 11A: desplegar y verificar el puente simulado en Raspberry' -Files @(
    'pi/scripts/diagnose.sh', 'pi/scripts/dev_setup.py', 'pi/scripts/smoke_bridge.py',
    'docs/hardware/diagnostico-2026-11-13.txt'
)
Commit-Phase -Title 'Etapa 11B: añadir respaldo local de voz con Piper, Vosk y caché' -Files @(
    'pi/voice/__init__.py', 'pi/voice/__main__.py', 'pi/requirements-voice.txt',
    'pi/test_voice.py', 'pi/test_voice_http.py', 'pi/systemd/ary-voice.service',
    'pi/scripts/download_models.py', 'pi/scripts/benchmark_voice.py',
    'pi/scripts/smoke_voice.py', 'pi/scripts/verify_voice.py', 'pi/README.md',
    'src/components/local-voice.ts', 'src/components/use-ary-voice.ts',
    'src/components/ary-chat.tsx', 'src/components/kiosk.tsx', 'next.config.ts',
    'scripts/voice-assets.ts', 'scripts/sync-voice-assets.ps1',
    'tests/unit/local-voice.test.ts', 'docs/hardware/voz-local-etapa11.md'
)
Commit-Phase -Title 'Etapa 11C: documentar seguridad de Arduino y evidencia del despliegue' -Files @(
    'docs/hardware/arduino-checklist.md', 'docs/hardware/informe-etapa11.md',
    'docs/hardware/evidencia-etapa11.txt', 'docs/hardware/commits-etapa11.ps1'
)
