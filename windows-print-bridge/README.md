# Dil Bebidas Windows Print Bridge

Bridge local para Windows usado pelo painel de pedidos da `Dil Bebidas` para:

- listar impressoras instaladas no Windows;
- salvar a impressora selecionada pelo lojista;
- imprimir cupons em texto diretamente na impressora escolhida;
- permitir autoimpressao sem clique extra no sistema web.

## Como funciona

O `frontend` do painel tenta falar com `http://127.0.0.1:39876`.

Quando o bridge esta online:

- o painel mostra o status `bridge conectado`;
- carrega a lista de impressoras do Windows;
- permite escolher a impressora;
- envia o cupom do pedido como texto para o endpoint local `/print-text`.

Quando o bridge nao esta online:

- o painel continua funcionando;
- a impressao cai no modo de navegador.

## Requisitos

- Windows com Node.js instalado
- PowerShell habilitado
- impressora ja instalada no Windows

## Instalar a inicializacao automatica (recomendado)

Requisito: Node.js instalado (https://nodejs.org/, versao LTS). O instalador
verifica isso sozinho e avisa claramente se nao encontrar.

Abra o PowerShell **dentro desta pasta** (`windows-print-bridge`) e rode:

```powershell
.\instalar-inicializacao-automatica.ps1
```

Isso cria uma tarefa chamada **"Extraplus Windows Print Bridge"** no
Agendador de Tarefas do Windows, configurada para:

- disparar no logon do usuario atual;
- rodar `start-hidden.vbs`, que inicia `npm start` (ou seja, `server.js`)
  **sem nenhuma janela de terminal visivel**;
- usar o diretorio de trabalho correto (a propria pasta do projeto);
- funcionar independente de onde o projeto foi colocado (Downloads,
  Desktop, etc.) e independente de qual pasta o PowerShell estava aberto —
  todos os caminhos usados sao absolutos.

O instalador tambem inicia o bridge imediatamente (nao precisa reiniciar a
maquina nem deslogar) e pode ser executado quantas vezes for preciso: ele
sempre remove a tarefa anterior antes de recriar, **nunca duplica**.

A partir daí, o admin nunca mais precisa abrir prompt/PowerShell para
imprimir: e so entrar no painel pelo navegador, que ele sincroniza sozinho
com o bridge (o painel tenta se conectar automaticamente e continua tentando
em segundo plano se o bridge ainda nao estiver de pe).

## Verificar se o Print Bridge esta rodando

Qualquer uma destas formas:

- Abra `http://127.0.0.1:39876/health` num navegador nesta maquina — deve
  responder um JSON com `"ok": true`.
- No painel de Pedidos do admin (navegador), veja o status **"Bridge local
  conectado"**.
- No Windows, abra o **Agendador de Tarefas** (`taskschd.msc`) e procure por
  **"Extraplus Windows Print Bridge"** na Biblioteca de Tarefas — o campo
  "Status" mostra se ja disparou e o resultado da ultima execucao.
- No **Gerenciador de Tarefas** do Windows, aba "Detalhes", deve existir um
  processo `node.exe` rodando (esse e o `server.js`).

## Remover a inicializacao automatica

```powershell
.\remover-inicializacao-automatica.ps1
```

Isso remove a tarefa do Agendador de Tarefas (e qualquer atalho de uma
instalacao antiga que ainda exista na pasta Startup). O processo do bridge
que ja estiver rodando **nao** e encerrado por esse script — se quiser parar
agora, feche o processo `node.exe` pelo Gerenciador de Tarefas.

## Iniciar manualmente (modo antigo, so para depuracao)

No Windows, abra PowerShell nesta pasta e rode:

```powershell
npm start
```

O servico sobe em:

```text
http://127.0.0.1:39876
```

## Diagnosticar problemas

- **Cupom saindo errado (quebrado por caractere, acento virando simbolo
  estranho tipo "nÂ°") mesmo depois de um fix de impressao:** o
  `server.js` roda de um arquivo **local** nesta pasta, ele nao atualiza
  sozinho como o site (que usa deploy automatico). Se voce baixou uma
  versao nova do projeto, precisa **substituir os arquivos desta pasta
  pelos novos e reiniciar o bridge** (feche o processo `node.exe` no
  Gerenciador de Tarefas e rode `Start-ScheduledTask -TaskName "Extraplus
  Windows Print Bridge"`, ou reinicie o Windows). Para confirmar qual
  versao esta rodando de fato, abra `http://127.0.0.1:39876/health` num
  navegador nesta maquina: o campo `"version"` deve ser `1.1.0` ou mais
  recente e deve existir um campo `"printMode": "escpos-raw"`. Se o
  `/health` nao tiver esses campos (ou o navegador mostrar um `version`
  mais antigo), o bridge antigo ainda esta rodando.
- **`.\instalar-inicializacao-automatica.ps1` diz que nao encontrou o
  Node.js:** instale o Node.js LTS em https://nodejs.org/, feche e abra um
  novo PowerShell (para o PATH atualizar) e rode o instalador de novo.
- **A tarefa existe no Agendador de Tarefas mas `http://127.0.0.1:39876/health`
  nao responde:** confira no Gerenciador de Tarefas se existe um processo
  `node.exe`. Se nao existir, rode `Start-ScheduledTask -TaskName "Extraplus
  Windows Print Bridge"` no PowerShell para forcar o disparo, ou rode
  `npm start` manualmente nesta pasta para ver a mensagem de erro exata.
- **O painel mostra "Bridge local nao conectado" mesmo com o `node.exe`
  rodando:** confira se a origem do navegador (o dominio do painel) esta na
  lista `ALLOWED_ORIGINS` dentro de `server.js`.
- **Erro de impressora nao encontrada ao imprimir:** confirme que a
  impressora aparece em "Impressoras e dispositivos" do Windows com esse
  mesmo nome, e que ela esta selecionada no painel de Pedidos do admin.

## Endpoints

- `GET /health`
- `GET /printers`
- `GET /settings`
- `PUT /settings`
- `POST /print-text`

## Observacoes

- A impressao usa comandos **ESC/POS crus**, enviados direto pro spooler
  como datatype `RAW` (bypassa o renderizador de texto do driver do
  Windows). Isso e necessario para impressora termica: o driver generico de
  texto usa uma fonte proporcional grande demais pra largura fisica da
  bobina, o que fazia o cupom sair quebrando quase a cada caractere.
- O texto do cupom (`buildBridgeReceiptText`, em
  `frontend/src/app/admin/orders/page.tsx`) e formatado para **32 colunas**
  por padrao, valor seguro/compativel para bobina de 57/58mm na fonte padrao
  ESC/POS (Font A). Nao e "57mm = 57 caracteres" — a quantidade de colunas
  depende da fonte e do DPI da impressora, nao so da largura fisica do
  papel. **Largura, margem esquerda e ativar/desativar o bridge agora sao
  configuraveis direto no painel** (tela de Pedidos do admin, seção
  "Impressora do bridge") — inclui um botão "Pre-visualizar impressao" que
  mostra exatamente como o cupom vai sair, com a largura/margem atuais,
  antes de reativar a impressao automatica. Essas configuracoes ficam
  salvas no bridge (`GET/PUT /settings`: `charactersPerLine`, `marginLeft`,
  `bridgeEnabled`), nao precisa editar codigo.
- Acentos sao removidos do texto antes de imprimir (`stripAccentsForPrint`)
  porque a impressao RAW nao passa pela conversao de codepage do Windows —
  sem isso, "ç"/"ã"/etc. poderiam sair como caracteres errados dependendo
  da codepage ativa na impressora.
- Para layouts graficos, imagens e impressao HTML completa, o proximo passo
  recomendado e evoluir este bridge para:
  - `Electron + impressora nativa`, ou
  - `bridge com impressao PDF direta por executavel nativo`.
- O sistema web ja fica preparado para usar esse bridge agora, mas ainda mantem fallback de navegador para nao travar a operacao.
