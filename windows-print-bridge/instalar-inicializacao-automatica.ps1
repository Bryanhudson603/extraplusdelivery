#Requires -Version 5.1
<#
  Instala a inicializacao automatica do Extraplus Windows Print Bridge.

  Cria uma tarefa no Agendador de Tarefas do Windows que dispara no logon
  do usuario atual e roda start-hidden.vbs (que por sua vez inicia
  "npm start" sem nenhuma janela visivel). Nao depende do diretorio atual
  do PowerShell nem de onde o projeto foi colocado (funciona em Downloads,
  Desktop, etc.), pois todos os caminhos usados sao absolutos, resolvidos
  a partir da localizacao real deste script.
#>

$ErrorActionPreference = 'Stop'

$TaskName = 'Extraplus Windows Print Bridge'

function Write-Step {
    param([string]$Message)
    Write-Host $Message
}

function Write-Falha {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

# --- 1. Resolver caminhos absolutos a partir da localizacao real deste script ---
# $PSScriptRoot ja e absoluto e nao depende de onde o PowerShell foi aberto.
$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$scriptDir = (Resolve-Path -LiteralPath $scriptDir).Path

$vbsPath = Join-Path $scriptDir 'start-hidden.vbs'
$serverPath = Join-Path $scriptDir 'server.js'

Write-Step "Pasta do projeto (Print Bridge): $scriptDir"

if (-not (Test-Path -LiteralPath $vbsPath)) {
    throw "Nao encontrei start-hidden.vbs em: $vbsPath`nConfirme que este instalador esta dentro da pasta windows-print-bridge do projeto."
}
if (-not (Test-Path -LiteralPath $serverPath)) {
    throw "Nao encontrei server.js em: $serverPath`nConfirme que este instalador esta dentro da pasta windows-print-bridge do projeto."
}

# --- 2. Verificar se o Node.js esta instalado ---
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
}
if (-not $nodeCommand) {
    Write-Host ''
    Write-Falha 'ERRO: Node.js nao foi encontrado no PATH deste usuario.'
    Write-Falha 'Instale o Node.js em https://nodejs.org/ (versao LTS) e rode este instalador novamente.'
    Write-Falha 'Depois de instalar, feche e abra um novo PowerShell para o PATH ser atualizado.'
    exit 1
}
$nodePath = $nodeCommand.Source
Write-Step "Node.js encontrado em: $nodePath"

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $npmCommand) {
    Write-Host ''
    Write-Falha 'ERRO: npm nao foi encontrado no PATH deste usuario (normalmente instalado junto com o Node.js).'
    Write-Falha 'Reinstale o Node.js pelo instalador oficial em https://nodejs.org/ e tente novamente.'
    exit 1
}
Write-Step "npm encontrado em: $($npmCommand.Source)"

# --- 3. Limpar instalacao antiga (versao anterior usava atalho na pasta Startup) ---
# Evita duas instancias do bridge rodando ao mesmo tempo (conflito na porta 39876).
$startupFolder = [Environment]::GetFolderPath('Startup')
$legacyShortcut = Join-Path $startupFolder 'Dil Bebidas Print Bridge.lnk'
if (Test-Path -LiteralPath $legacyShortcut) {
    Remove-Item -LiteralPath $legacyShortcut -Force
    Write-Step "Atalho antigo de inicializacao (pasta Startup) removido: $legacyShortcut"
}

# --- 4. Criar/atualizar a tarefa no Agendador de Tarefas, sem duplicar ---
$quotedVbsPath = '"' + $vbsPath + '"'
$wscriptExe = Join-Path $env:WINDIR 'System32\wscript.exe'

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Step "Tarefa '$TaskName' ja existia, removendo antes de recriar (evita duplicidade)."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute $wscriptExe -Argument $quotedVbsPath -WorkingDirectory $scriptDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
    -Description 'Inicia o Extraplus Windows Print Bridge automaticamente e sem janela visivel ao entrar no Windows.' `
    -Force | Out-Null

Write-Step "Tarefa criada no Agendador de Tarefas do Windows: $TaskName"
Write-Step "  - Dispara em: logon de '$env:USERNAME'"
Write-Step "  - Executa: $wscriptExe $quotedVbsPath"
Write-Step "  - Diretorio de trabalho: $scriptDir"

# --- 5. Iniciar agora, sem esperar o proximo login ---
Write-Step 'Iniciando o Print Bridge agora...'
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 2

$taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
$task = Get-ScheduledTask -TaskName $TaskName

Write-Host ''
Write-Host 'Instalacao concluida.' -ForegroundColor Green
Write-Host 'Resumo:'
Write-Host "  - Node.js:        $nodePath"
Write-Host "  - Projeto:        $scriptDir"
Write-Host "  - Tarefa:         $TaskName"
Write-Host "  - Estado da tarefa: $($task.State)"
Write-Host "  - Ultima execucao:  $($taskInfo.LastRunTime)"
Write-Host ''
Write-Host 'Para conferir se o bridge esta rodando:'
Write-Host '  - Abra http://127.0.0.1:39876/health em um navegador nesta maquina; ou'
Write-Host "  - Va no painel de Pedidos do admin e veja o status 'Bridge local conectado'."
