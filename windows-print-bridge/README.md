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

## Subir o bridge automaticamente, sem terminal (recomendado)

Rode isso **uma unica vez** no PowerShell, dentro desta pasta:

```powershell
npm install
.\instalar-inicializacao-automatica.ps1
```

Isso cria um atalho na pasta de Inicializacao do Windows (`shell:startup`) que
inicia o bridge sozinho, **sem nenhuma janela de terminal visivel**, sempre que
o usuario logar no Windows. O script tambem inicia o bridge imediatamente,
sem precisar reiniciar a maquina.

A partir daí, o admin nunca mais precisa abrir prompt/PowerShell para
imprimir: e so entrar no painel pelo navegador, que ele sincroniza sozinho
com o bridge (o painel tenta se conectar automaticamente e continua tentando
em segundo plano se o bridge ainda nao estiver de pe).

Para desfazer a inicializacao automatica:

```powershell
.\remover-inicializacao-automatica.ps1
```

## Subir o bridge manualmente (modo antigo, so para depuracao)

No Windows, abra PowerShell nesta pasta e rode:

```powershell
npm start
```

O servico sobe em:

```text
http://127.0.0.1:39876
```

## Endpoints

- `GET /health`
- `GET /printers`
- `GET /settings`
- `PUT /settings`
- `POST /print-text`

## Observacoes

- A impressao silenciosa por impressora especifica usa `Out-Printer`, por isso o cupom e enviado em texto.
- Para layouts graficos, imagens e impressao HTML completa, o proximo passo recomendado e evoluir este bridge para:
  - `Electron + impressora nativa`, ou
  - `servico Windows + biblioteca ESC/POS`, ou
  - `bridge com impressao PDF direta por executavel nativo`.
- O sistema web ja fica preparado para usar esse bridge agora, mas ainda mantem fallback de navegador para nao travar a operacao.
