$ErrorActionPreference = 'Stop'

$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'Dil Bebidas Print Bridge.lnk'

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "Inicializacao automatica removida: $shortcutPath"
} else {
    Write-Host "Nenhum atalho de inicializacao automatica encontrado em: $shortcutPath"
}

Write-Host "O bridge que ja estiver rodando nao e encerrado por este script. Feche o processo 'node.exe' pelo Gerenciador de Tarefas se quiser parar agora."
