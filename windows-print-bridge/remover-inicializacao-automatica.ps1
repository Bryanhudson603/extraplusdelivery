#Requires -Version 5.1
<#
  Remove a inicializacao automatica do Extraplus Windows Print Bridge
  criada por instalar-inicializacao-automatica.ps1 (tarefa no Agendador
  de Tarefas do Windows). Tambem remove o atalho legado da pasta
  Startup, caso exista de uma instalacao antiga.
#>

$ErrorActionPreference = 'Stop'

$TaskName = 'Extraplus Windows Print Bridge'

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    if ($existingTask.State -eq 'Running') {
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Tarefa agendada removida: $TaskName"
} else {
    Write-Host "Nenhuma tarefa agendada chamada '$TaskName' foi encontrada."
}

# Compatibilidade com instalacoes antigas (versao anterior usava atalho na pasta Startup)
$startupFolder = [Environment]::GetFolderPath('Startup')
$legacyShortcut = Join-Path $startupFolder 'Dil Bebidas Print Bridge.lnk'
if (Test-Path -LiteralPath $legacyShortcut) {
    Remove-Item -LiteralPath $legacyShortcut -Force
    Write-Host "Atalho antigo de inicializacao (pasta Startup) removido: $legacyShortcut"
}

Write-Host ''
Write-Host 'Inicializacao automatica removida. O processo do bridge que ja estiver rodando NAO e encerrado por este script.'
Write-Host "Se quiser parar agora, feche o processo 'node.exe' pelo Gerenciador de Tarefas."
