$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsPath = Join-Path $scriptDir 'start-hidden.vbs'
$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'Dil Bebidas Print Bridge.lnk'

if (-not (Test-Path $vbsPath)) {
    throw "Nao encontrei start-hidden.vbs em $scriptDir"
}

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$shortcut.Arguments = '"' + $vbsPath + '"'
$shortcut.WorkingDirectory = $scriptDir
$shortcut.WindowStyle = 7
$shortcut.Description = 'Inicia o Dil Bebidas Print Bridge automaticamente, sem janela visivel, ao entrar no Windows.'
$shortcut.Save()

Write-Host "Inicializacao automatica instalada em: $shortcutPath"
Write-Host "A partir do proximo login do Windows, o bridge vai iniciar sozinho, sem nenhuma janela de terminal."

Write-Host "Iniciando o bridge agora, sem esperar o proximo login..."
Start-Process -FilePath (Join-Path $env:WINDIR 'System32\wscript.exe') -ArgumentList "`"$vbsPath`""

Write-Host "Pronto. Va no navegador, na tela de Pedidos do admin, e clique em 'Sincronizar bridge' (ou aguarde a sincronizacao automatica)."
