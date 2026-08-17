# CONTEXTO_PROJETO.md — Extraplus / Dil Bebidas Delivery

> Documento de continuidade. Gerado ao final de uma sessão longa de trabalho no projeto.
> Leia a seção **COMO CONTINUAR** no final antes de fazer qualquer alteração.

---

## 1. RESUMO DO PROJETO

**Objetivo:** aplicação de delivery de bebidas para uma loja física ("Dil Bebidas", em Rio Largo/AL), com app do cliente (mobile/PWA) e painel de administração.

**Funcionalidade principal:** cliente navega catálogo, monta carrinho (unidade ou fardo), faz login/cadastro, finaliza pedido (PIX/cartão na entrega/dinheiro), acompanha status. Lojista gerencia pedidos, produtos, clientes, cupons, entregadores pelo painel admin. Existe também um nível de "administrador de sistema/plataforma" que gerencia múltiplas lojas, usuários e pode intervir diretamente sobre pedidos.

**Tecnologias:**
- **Backend:** NestJS (Node/TypeScript), TypeORM, `jsonwebtoken` (JWT manual, **sem** Passport), `bcrypt`, `class-validator`.
- **Frontend:** Next.js 14 (App Router) — **não é Vite**, apesar de já ter sido descrito assim em conversa anterior. React 18, Tailwind CSS, `framer-motion`.
- **Banco de dados:** PostgreSQL, acessado via `DATABASE_URL`. Provedor exato (Supabase vs. Postgres gerenciado pelo Render) **não confirmado** neste histórico — há dependência `@supabase/supabase-js` no backend, mas o acesso runtime é genérico via TypeORM/`DATABASE_URL`.
- **Serviços externos:** Google OAuth (`google-auth-library`), ViaCEP (busca de CEP, sem chave), WhatsApp (`wa.me`, sem API paga), Windows Print Bridge local (serviço próprio em `windows-print-bridge/`, porta `39876`, para impressão automática de cupons).
- **Deploy/infra:** Backend no **Render** (`https://extraplusdelivery.onrender.com`), Frontend na **Vercel** (`https://www.dilbebidas.com.br`). Repositório: `https://github.com/Bryanhudson603/extraplusdelivery`, branch `main`, commits diretos (sem PR).

---

## 2. ARQUITETURA

- O frontend Next.js tem um **proxy server-side** em `frontend/src/app/api/[...path]/route.ts`: toda chamada `fetch` do app para `/api/*` é interceptada por esse route handler, que repassa (server-to-server) para o backend real usando a env var `BACKEND_URL` (só existe no ambiente Node da Vercel, nunca chega ao browser).
- Por isso, do ponto de vista do navegador, as chamadas de API parecem **same-origin** (`www.dilbebidas.com.br/api/...`), mesmo o backend estando em outro domínio (Render). Isso é o que faz o cookie de sessão (`extraplus_token`, httpOnly) funcionar sem CORS complicado: ele acaba sendo emitido/lido sempre no domínio do frontend.
- **Exceção importante:** o fluxo OAuth do Google não passa por esse proxy — o Google redireciona o navegador **diretamente** para o backend no Render (é assim que o "Authorized redirect URI" tem que ser cadastrado no Google Cloud). Isso quebraria o cookie de sessão se fosse setado ali direto (ficaria no domínio do Render, não no do frontend). Foi resolvido com um **ticket de troca de uso único**: o callback no Render gera um ticket opaco e redireciona para uma página do frontend, que troca o ticket pela sessão via `POST /api/auth/google/exchange` — essa chamada sim passa pelo proxy, então o cookie final fica no domínio certo. Ver seção 6 e 11.
- `NEXT_PUBLIC_API_URL` (client-side, pública) é usada só quando é preciso montar uma **URL absoluta** do backend a partir do navegador (ex.: redirecionar para `/auth/google` ao clicar em "Continuar com Google", ou em dev local apontando pra `localhost:3000`).
- Multi-tenant: existe o conceito de `loja` (uma linha na tabela `lojas`); praticamente todas as entidades (`usuarios`, `clientes`, `produtos`, `pedidos`, `categorias`, `cupons`, `entregadores`) têm `loja_id`. Hoje na prática só existe uma loja ativa em uso (Dil Bebidas), mas o código já é multi-loja.

---

## 3. ESTRUTURA DO PROJETO (arquivos relevantes)

```
backend/
  src/
    main.ts                          # bootstrap, prefixo global 'api' (com exceção do callback Google), CORS, checks de env obrigatórias em produção
    data-source.ts                   # DataSource do TypeORM p/ CLI de migrations (lista entidades)
    app.module.ts                    # módulo raiz, registra todos os módulos de feature
    config/database.config.ts        # monta config do TypeORM a partir de DATABASE_URL ou DB_HOST/USER/...
    auth/
      auth-token.ts                  # assinatura/verificação de JWT, leitura de cookie, helpers compartilhados (getAuthCookieOptions, readRawCookie)
      require-auth.guard.ts          # guard RequireAuth('admin'|'cliente'|'plataforma')
    common/
      delivery.ts                    # cálculo de taxa de entrega por bairro (usado por pedidos.service)
      resolve-loja-id.ts             # resolve lojaId a partir do JWT ou da primeira loja ativa
    entities/                        # ClienteEntity, UsuarioEntity, LojaEntity, ProdutoEntity, PedidoEntity, SocialAccountEntity, etc.
    repositories/                    # um repository por entidade, métodos de acesso a dados
    migrations/                      # migrations SQL puro (ver seção 7)
    modules/
      auth/                          # login tradicional (admin/cliente/plataforma) + login Google (novo)
      admin/                         # painel do lojista: dashboard, clientes, produtos (+ import CSV), cupons, loja/pedidos-pausados
      catalogo/                      # catálogo público consumido pelo app do cliente
      pedidos/                       # criação/consulta/atualização de pedidos, cupom
      platform/                      # administrador de sistema: lojas, usuários, ZERAR PEDIDOS (novo), listar/apagar pedidos (novo)
      entregadores/, storage/        # entregadores e upload de imagens de produto

frontend/
  src/
    app/
      api/[...path]/route.ts         # proxy server-side descrito na seção 2
      login/page.tsx                 # login/cadastro de cliente (telefone+senha) + botão Google
      login/google/callback/page.tsx # troca o ticket do Google pela sessão
      home/, catalog/                # navegação de produtos do cliente
      checkout/page.tsx              # finalização de pedido, tela de sucesso, chave PIX
      profile/page.tsx               # perfil do cliente, "Meus endereços"
      admin/                         # painel do lojista (login, dashboard, orders, products, customers, settings, reports)
      platform/                      # painel do administrador de sistema (login + página única)
    components/
      CartProvider.tsx               # estado do carrinho (localStorage), agora com suporte a fardo (ver seção 6/11)
      CartDrawer.tsx                 # UI do carrinho lateral
      ProductCard.tsx                # card de produto, botões "Adicionar" e "Fardo Nx"
      AddressModal.tsx               # cadastro estruturado de endereço (substituiu prompt())
      OrderSuccessModal.tsx          # tela pós-pedido: WhatsApp localização + chave PIX/comprovante
      GoogleLoginButton.tsx
      CategoryList.tsx
    lib/
      api.ts                         # wrapper de fetch (credentials include, trata FormData/JSON)
      addresses.ts                   # CRUD de endereços no localStorage + migração de formato antigo
      contact.ts                     # constantes: número do WhatsApp da loja, chave PIX
      delivery.ts                    # lista fixa de bairros atendidos + taxa (Rio Largo/AL) — espelha common/delivery.ts do backend
      data.ts                        # categorias fixas do catálogo

windows-print-bridge/                # serviço Node local (Windows) para impressão automática via porta 39876; não hospedado, roda na máquina do lojista
ADmin/                                # pasta legada na raiz, NÃO referenciada em lugar nenhum do código — candidata a remoção, nunca removida
```

---

## 4. ESTADO ATUAL

- ✅ Login tradicional cliente (telefone+senha) e lojista (usuário+senha)
- ✅ Login social Google (cliente) — funcionando em produção, testado ponta a ponta
- ✅ Catálogo, categorias (com filtro funcionando), carrinho, checkout
- ✅ Preço de fardo no carrinho/checkout (corrigido nesta sessão)
- ✅ Cadastro/edição/exclusão de endereço estruturado no Perfil
- ✅ Tela de sucesso do pedido com WhatsApp (localização) e chave PIX + aviso de comprovante
- ✅ Remover/ajustar quantidade no carrinho; persistência do carrinho corrigida
- ✅ "Pausar chegada de pedidos" bloqueando checkout de verdade (antes era só cosmético)
- ✅ Admin de produtos: grade/lista, seleção múltipla para excluir, import CSV
- ✅ Painel de plataforma (admin de sistema): gestão de lojas/usuários, editar usuário/senha do lojista, zerar pedidos de um cliente, listar e apagar pedidos manualmente
- ✅ Carrinho adaptado ao tema escuro
- 🟡 Autoimpressão de pedidos na tela `/admin/orders`: código revisado e parece correto (liga por padrão, imprime pedido novo via bridge local ou diálogo do navegador), mas **não foi validado ao vivo com impressora real** — só análise de código.
- 🟡 Endereço do cliente: ainda vive só no `localStorage` do navegador do cliente, não no backend. Funciona para o fluxo de compra, mas não sincroniza entre dispositivos nem aparece automaticamente pro lojista fora do texto do próprio pedido.
- 🔴 Cliente sem telefone (contas criadas via Google) não tem tela de "completar perfil" — o telefone fica `null` até o cliente cadastrar algo manualmente (não há onde fazer isso hoje).
- 🔴 Nenhum endpoint de auto-serviço para o cliente editar os próprios dados (nome/telefone) — só o admin/loja e o admin/plataforma podem editar cliente.
- ⚠️ `backend/tsconfig.json` tem uma diferença de quebra de linha (CRLF/LF) não commitada, sem relação com nenhuma feature — ficou de fora de todos os commits desta sessão de propósito.
- ⚠️ `Firebase` está no `package.json` do frontend mas não é usado em lugar nenhum do código (`frontend/src`) — não mexido.
- ⚠️ Pasta `ADmin/` (raiz) é código morto (protótipo antigo em `.jsx`), não referenciada — não removida.

---

## 5. ALTERAÇÕES REALIZADAS (resumo por tema — detalhe cronológico na seção 16)

| Tema | Arquivos principais | Resultado | Status |
|---|---|---|---|
| Categorias Gelos/Vinhos + CSV de produtos | `catalogo.service.ts`, `admin.service.ts/dto/controller`, `data.ts`, `admin/products/page.tsx` | Categorias adicionadas em todos os lugares que precisavam bater (frontend + backend); CSV aceita Produto/CATEGORIA/VOLUME/Qtd. no Fardo/VALOR/PRECO DO FARDO/ESTOQUE | ✅ |
| Menu de ações do produto cortado + lista/seleção | `admin/products/page.tsx` | `overflow-hidden` no card cortava o dropdown; adicionado modo lista e seleção múltipla para excluir | ✅ |
| Clique em categoria não filtrava nada | `catalogo.service.ts` | `categoryId` estava **fixo em `'c6'`** pra todo produto — corrigido para mapear a categoria real | ✅ |
| Login social Google | `modules/auth/google-*`, `entities/socialAccount.entity.ts`, `entities/cliente.entity.ts`, `login/page.tsx`, `login/google/callback/page.tsx` | Fluxo completo com ticket de troca (ver seção 2) | ✅ |
| 404 no callback do Google | `main.ts` | Rota real cadastrada no Google não tem prefixo `/api`; excluída do prefixo global | ✅ |
| Endereço estruturado no Perfil | `AddressModal.tsx`, `lib/addresses.ts`, `profile/page.tsx` | Substitui `window.prompt()`; busca CEP via ViaCEP; migração automática do formato antigo (string simples) | ✅ |
| WhatsApp localização + PIX | `OrderSuccessModal.tsx`, `lib/contact.ts`, `checkout/page.tsx` | Geolocalização só sob clique explícito; chave PIX exibida; nunca armazena lat/long | ✅ |
| 400 ao finalizar pedido | `pedidos.dto.ts`, `checkout/page.tsx` | `@Length(1,...)` rejeitava string vazia em campo opcional | ✅ |
| Carrinho: remover/quantidade + bug de persistência | `CartProvider.tsx`, `CartDrawer.tsx` | Botões +/-/Remover; corrigida race condition que zerava o carrinho ao recarregar a página | ✅ |
| Pausar pedidos bloqueando de verdade | `pedidos.service.ts`, `admin/loja/pedidos-pausados` (novo), `admin/orders/page.tsx` | Antes só client-side; agora backend bloqueia com erro `PEDIDOS_PAUSADOS` | ✅ |
| Platform: zerar pedidos, editar lojista, listar/apagar pedidos | `platform.controller/service/dto/module.ts`, `platform/page.tsx` | Duas formas de apagar pedidos de teste (por cliente ou selecionando direto na lista); edição de username do lojista adicionada (antes só senha) | ✅ |
| Carrinho no tema escuro | `CartDrawer.tsx` | Fundo usava variável CSS só definida pro tema claro; texto ficava branco-em-branco | ✅ |
| Preço de fardo incorreto no carrinho | `CartProvider.tsx`, `CartDrawer.tsx`, `ProductCard.tsx`, `checkout/page.tsx` | Fardo era somado como N unidades pelo preço unitário; agora usa `packPrice` de verdade | ✅ |
| Categorias Petiscos/Gin/Whisky/Diversos | `catalogo.service.ts`, `lib/data.ts`, `admin/products/page.tsx` | Adicionadas em `categoriasFallback`, `CATEGORY_ID_POR_NOME`, `categories` (cliente) e `categories` (admin) — os 4 lugares que precisam bater | ✅ |
| "Mais pedidos" some ao filtrar categoria na Home | `home/page.tsx` | Seção só aparece sem categoria selecionada; antes ficava sempre visível | ✅ |
| Filtro de categoria do admin de produtos não funcionava | `admin/products/page.tsx` | Era um botão decorativo sem `onClick` + `<div className="hidden">` morta; virou `<select>` real ligado a `categoryFilter` | ✅ |
| Botão de menu do admin (mobile) atrás do botão de tema | `admin/layout.tsx` | `ThemeToggle` é `fixed top-3 right-3 z-50`; o botão de abrir menu também ficava no canto superior direito (header com `justify-between`), sobrepondo. Reordenado para ficar à esquerda, antes da logo | ✅ |

---

## 6. ANÁLISES E PROBLEMAS IDENTIFICADOS

### Cookie de sessão x proxy do frontend x domínio do Google
- **Causa:** callback OAuth precisa bater direto no Render (exigência do Google), mas isso faria o cookie de sessão nascer no domínio errado (Render, não `www.dilbebidas.com.br`), quebrando todo o resto do app que depende do proxy same-origin.
- **Solução aplicada:** ticket de troca de uso único (2 min de validade, apagado ao ser consumido) — o callback no Render nunca seta o cookie final; ele só gera o ticket e redireciona pro frontend, que troca o ticket pela sessão via uma chamada que passa pelo proxy.
- **Status:** ✅ resolvido e testado em produção.
- **Risco residual:** nenhum identificado.

### 404 no callback do Google
- **Causa:** `GOOGLE_CALLBACK_URL` (e o que está cadastrado no Google Cloud Console) não tem `/api`, mas `app.setGlobalPrefix('api')` cobria todas as rotas.
- **Solução:** excluída especificamente essa rota do prefixo global (`setGlobalPrefix` com `exclude`).
- **Status:** ✅ resolvido e confirmado em produção via teste direto na rota.

### `categoryId` fixo no catálogo
- **Causa:** `toProdutoCliente()` em `catalogo.service.ts` tinha `categoryId: 'c6'` hardcoded — bug pré-existente, não introduzido nesta sessão.
- **Status:** ✅ corrigido.

### 400 ao finalizar pedido (telefone/endereço vazios)
- **Causa:** contas de cliente via Google podem ter `telefone: null` (Google não fornece telefone) e `endereco: ''` (até cadastrar um). O DTO exigia `@Length(1, ...)` mesmo em campos `@IsOptional()` — string vazia não é `undefined`, então a validação disparava.
- **Solução:** `@Length(0, ...)` no backend + frontend passa a enviar `undefined` em vez de string vazia.
- **Status:** ✅ corrigido e confirmado em produção (reproduzido o erro antes e depois via `curl`).

### Fardo cobrando preço unitário
- **Causa:** `CartItem` só guardava `{product, qty}`; ao adicionar um fardo, o total de unidades era calculado e jogado nesse `qty`, então o carrinho sempre multiplicava pelo `price`/`promoPrice` da unidade, ignorando o `packPrice` cadastrado.
- **Solução:** `CartItem` ganhou `isPack?: boolean`; quando `true`, `qty` = número de fardos e o preço usado é `packPrice`. Linha de fardo e de unidade do mesmo produto ficam separadas (`cartLineId`).
- **Status:** ✅ corrigido e testado (fardo 12x a R$55 + 2 unidades a R$9,90 = R$74,80 correto).
- **Risco residual:** nenhum identificado — cobertura testada em carrinho e checkout (resumo + payload enviado ao backend).

### "Pausar chegada de pedidos" era só cosmético
- **Causa:** todo o estado (`isPaused`) vivia em `localStorage` do navegador do admin, sem nenhum endpoint de backend. Clientes continuavam finalizando pedidos normalmente.
- **Solução:** coluna `pedidos_pausados` em `lojas` + endpoints + bloqueio real em `PedidosService.criar()`.
- **Status:** ✅ corrigido. **Não confirmado** ao vivo por mim (não tenho login de admin da loja) — pedi para o usuário testar o fluxo completo, sem retorno registrado neste histórico.

### Pedidos de teste "não saíam" ao zerar por cliente
- **Causa:** pedidos de teste criados via chamada direta à API (durante verificação minha) não tinham `clienteId` nem `clienteTelefone` vinculados a nenhuma conta — ficavam órfãos, e o "zerar pedidos do cliente" só localiza pedidos vinculados a uma conta.
- **Solução:** nova tela em `/platform` lista **todos** os pedidos (de todas as lojas) com seleção manual e exclusão direta por ID, independente de vínculo com cliente.
- **Status:** ✅ implementado e confirmado (rota ativa em produção). Uso efetivo (apagar os pedidos de teste específicos) fica a critério do usuário.

---

## 7. BANCO DE DADOS

- **Banco:** PostgreSQL via `DATABASE_URL` (TypeORM, `synchronize: false`, `migrationsRun: true` — migrations rodam sozinhas no boot).
- **Tabelas relevantes:** `lojas`, `usuarios` (lojista), `clientes`, `categorias`, `produtos`, `pedidos`, `pedido_itens`, `cupons`, `cupom_clientes`, `cliente_carteira`, `entregadores`, `social_accounts` (nova).
- **Relacionamentos importantes:**
  - Quase tudo tem `loja_id` (multi-tenant).
  - `pedidos.cliente_id` → `clientes.id` (`ON DELETE SET NULL`); `pedidos.entregador_id` idem.
  - `pedido_itens.pedido_id` → `pedidos.id` (`ON DELETE CASCADE`) — apagar um pedido apaga os itens automaticamente.
  - `social_accounts.cliente_id` → `clientes.id` (`ON DELETE CASCADE`); único por `(provider, provider_user_id)` e por `(cliente_id, provider)`.
- **Migrations criadas nesta sessão** (em `backend/src/migrations/`, ordem cronológica):
  1. `20260811000100-add-social-login.ts` — `clientes.email` (nullable, índice único case-insensitive), `clientes.telefone` passa a aceitar `null`, tabela `social_accounts`.
  2. `20260811120000-add-loja-pedidos-pausados.ts` — `lojas.pedidos_pausados` (boolean, default `false`).
  - Nenhuma migration apaga dados existentes; todas são idempotentes (`if not exists`).
- **Regras importantes:**
  - `clientes.senha_hash` continua **obrigatório** mesmo para contas Google — recebe um hash de valor aleatório (nunca combinável com senha real), para não precisar tornar a coluna nullable.
  - `clientes.telefone` é opcional desde a migration de login social; código que consome esse campo já foi ajustado para tratar `null`/string vazia.
  - Bairro do endereço é sempre um dos 8 valores fixos da lista `DELIVERY_NEIGHBORHOODS` (replicada em `backend/src/common/delivery.ts` e `frontend/src/lib/delivery.ts`) — **não transformar em texto livre**, pois o cálculo de taxa de entrega depende do nome bater exatamente.

---

## 8. BACKEND

**Autenticação:** JWT manual (`jsonwebtoken`, não Passport), cookie httpOnly `extraplus_token` (7 dias), payload `{sub, tipo: 'admin'|'cliente'|'plataforma', lojaId?, username?/telefone?}`. Guard `RequireAuth(...tipos)`.

**Endpoints importantes criados/alterados nesta sessão:**
- `GET/POST /api/auth/google`, `GET /auth/google/callback` (**sem** `/api`, ver seção 6), `POST /api/auth/google/exchange`
- `POST /api/admin/produtos/importar-csv`
- `GET/PUT /api/admin/loja/pedidos-pausados`
- `DELETE /api/platform/usuarios/cliente/:id/pedidos` (zera histórico de um cliente)
- `GET /api/platform/pedidos`, `POST /api/platform/pedidos/apagar` (lista/apaga pedidos manualmente)
- `PUT /api/platform/usuarios/admin/:id` — agora aceita `username` além de `senha`/`lojaId`/`ativo`

**Regras de negócio relevantes:**
- `PedidosService.criar()` bloqueia com `BadRequestException({code: 'PEDIDOS_PAUSADOS', message: '...'})` se `loja.pedidosPausados === true`.
- Login Google: procura por `social_accounts (provider, provider_user_id)` → se não achar, procura `clientes.email` → se não achar, cria cliente novo (sem telefone, endereço vazio) e vincula.
- CSV de produtos: parsing tolerante a `;`/`,` como separador e vírgula ou ponto decimal; colunas obrigatórias Produto/CATEGORIA/VALOR, demais opcionais.

**Integrações:** `google-auth-library` (verificação de id_token: assinatura, issuer, audience), ViaCEP (chamado direto do frontend, não do backend).

---

## 9. FRONTEND

**Telas/fluxos alterados nesta sessão:**
- `/login` — telefone+senha ou "Continuar com Google"; trata `?error=...` vindo do backend.
- `/login/google/callback` — troca ticket, salva sessão, redireciona pra `/stores`.
- `/checkout` — resumo com preço correto de fardo, chave PIX quando forma de pagamento = PIX, tela de sucesso (`OrderSuccessModal`) com WhatsApp de localização e de comprovante.
- `/profile` — "Meus endereços" com modal estruturado (`AddressModal`) em vez de `prompt()`; editar/excluir com confirmação inline (sem `confirm()` nativo).
- `/admin/products` — grade/lista, seleção múltipla + exclusão, import CSV.
- `/admin/orders` — botão "Pausar chegada de pedidos" agora fala com o backend de verdade.
- `/platform` — nova seção "Pedidos" (lista geral + seleção + exclusão), botão "Editar" no admin (username/senha), botão "Zerar pedidos" por cliente.

**Estado do carrinho:** `CartProvider` (contexto React + `localStorage['cart']`). `CartItem = {product, qty, isPack?}`. Helpers exportados: `cartLineId`, `getCartLineUnitPrice`, `getCartLineTotal`, `getCartLineUnitsCount` — **usar sempre esses helpers** para preço/total de item de carrinho, nunca recalcular manualmente `product.price * qty` (perde o caso de fardo).

**Endereços do cliente:** vivem em `localStorage['extraplus-addresses']` (array de `AddressRecord`, ver `lib/addresses.ts`), sincronizados com `session.endereco` (string compacta `"rua, bairro, cidade"`) que é o que o checkout realmente usa para calcular taxa de entrega. Formato antigo (string simples) é migrado automaticamente na leitura.

**Padrão de UI seguido:** sem `alert()`/`confirm()`/`prompt()` nativos em nenhuma feature nova — confirmações são inline (estado local + botão "Confirmar"/"Cancelar").

---

## 10. CONFIGURAÇÕES E INFRAESTRUTURA

**Variáveis de ambiente (sem valores/segredos):**

Backend (Render):
- `DATABASE_URL` — obrigatória em produção
- `JWT_SECRET` — obrigatória em produção
- `FRONTEND_URL` — obrigatória em produção (`https://www.dilbebidas.com.br`), usada em CORS e nos redirects do fluxo Google
- `PLATFORM_ADMIN_USER`, `PLATFORM_ADMIN_PASS_HASH` — obrigatórias sempre (login do admin de plataforma, não fica no banco)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` — login Google (`GOOGLE_CALLBACK_URL` = `https://extraplusdelivery.onrender.com/auth/google/callback`, **sem** `/api`)
- `PORT` (default 3000), `NODE_ENV`

Frontend (Vercel):
- `NEXT_PUBLIC_API_URL` — `https://extraplusdelivery.onrender.com` (pública, usada para montar URLs absolutas do backend)
- `BACKEND_URL` — **server-only**, usada pelo proxy `app/api/[...path]/route.ts` (não confirmado o valor exato configurado na Vercel, mas precisa apontar pro mesmo backend)

**Portas locais (dev):** backend `3000`, frontend `3001` (usei portas alternativas 3002–3006 durante testes desta sessão só porque o dev server do Next ficava com cache de build corrompido após muitas edições seguidas — não é uma configuração permanente, só reinício limpo).

**URLs de produção:**
- Frontend: `https://www.dilbebidas.com.br`
- Backend: `https://extraplusdelivery.onrender.com`

**Serviços externos usados:** Google Cloud Console (OAuth Client ID já configurado e funcionando), ViaCEP (sem autenticação), WhatsApp via link `wa.me` (sem API paga).

**Print bridge local:** `windows-print-bridge/` roda na máquina do lojista (porta `39876`), fora do deploy do Render/Vercel — não fica online, só quando o lojista abre o serviço localmente.

---

## 11. DECISÕES TÉCNICAS (não refazer sem necessidade)

1. **Login Google só para clientes**, não para lojista/admin — decisão deliberada (painel interno não precisa de SSO).
2. **Sem Passport** — login Google implementado direto com `google-auth-library`, mantendo o mesmo estilo manual de JWT já usado no resto do backend.
3. **Ticket de troca de uso único** para o handoff pós-callback do Google — não trocar por outra abordagem sem entender o problema de domínio do cookie descrito na seção 2/6.
4. **Bairro do endereço = seleção fixa**, nunca texto livre — decisão para não quebrar o cálculo de taxa de entrega.
5. **Endereços do cliente ficam no `localStorage`**, não no backend — decisão consciente para não expandir o escopo (o backend nunca teve isso; manter compatível com o que já existia).
6. **`clientes.senha_hash` continua obrigatório** mesmo para contas Google (hash aleatório não reutilizável) em vez de tornar a coluna nullable — menor blast radius.
7. **Todas as migrations são idempotentes e aditivas** — nunca `drop column`/`drop table` destrutivo em cima de dado existente.
8. **Sem `alert()`/`confirm()`/`prompt()` nativos** em nenhuma tela nova — todas as confirmações destrutivas usam UI inline.
9. **Helpers de preço de carrinho centralizados** (`getCartLineTotal` etc.) — qualquer tela nova que mostrar preço de item de carrinho deve usá-los.

---

## 12. REGRAS E CUIDADOS

- **Nunca** trocar o texto/nome do bairro por campo livre sem também revisar `common/delivery.ts` (backend) e `lib/delivery.ts` (frontend) — os dois precisam continuar batendo.
- **Nunca** alterar `GOOGLE_CALLBACK_URL`/rota do callback sem entender que ela é **intencionalmente** excluída do prefixo `/api` (seção 6) — mexer nisso sem cuidado reintroduz o 404.
- Ao mexer em carrinho/checkout, **sempre** passar por `cartLineId`/`getCartLineTotal`/`getCartLineUnitPrice` — não voltar a fazer `product.price * qty` direto.
- Ao mexer em `CriarPedidoDto`/`ValidarCupomDto`, lembrar que campos opcionais devem aceitar string vazia (`@Length(0, ...)`) — contas Google podem não ter telefone/endereço.
- `backend/tsconfig.json` tem uma diferença de line-ending pendente, não relacionada a nenhuma feature — **não commitar** essa mudança "sem querer" junto de outra alteração; ela foi deixada de fora de propósito em todos os commits desta sessão.
- Migrations sempre com `if not exists`/`if exists` e sem `drop` destrutivo de dado real.

---

## 13. PROBLEMAS CONHECIDOS

- Autoimpressão (`/admin/orders`) não foi validada com impressora real nesta sessão — só revisão de código (ver seção 4).
- "Pausar chegada de pedidos" foi implementado e verificado apenas parcialmente em produção (rota confirmada no ar; o fluxo completo de bloqueio no checkout do cliente não foi confirmado com retorno do usuário).
- Cliente com telefone nulo (via Google) não tem como completar o cadastro (telefone/endereço) por autoatendimento — só admin da loja ou da plataforma podem editar.
- `ADmin/` (pasta legada) e dependência `firebase` não usada seguem no repositório, sem impacto funcional conhecido.
- Durante testes desta sessão foram criados alguns pedidos de teste reais em produção (ex.: "Teste QA", "Teste pausa") — parte pode já ter sido removida pelo usuário via a nova tela de pedidos do `/platform`; **não confirmado** se sobrou algum.
- Horário de funcionamento/entrega (seção 14): implementado e com typecheck limpo, mas **sem verificação visual ao vivo** (backend depende de Postgres real, não foi possível subir os dois servidores localmente nesta sessão). Vale o usuário confirmar em produção que a loja aparece "Fechada" e bloqueia pedido depois do horário configurado, e que "Horários" no admin agora salva de verdade (antes era só `localStorage`).
- Timezone do cálculo de horário está fixo em `America/Maceio` (`backend/src/common/store-hours.ts`) — correto para a loja atual (Rio Largo/AL); se algum dia existir loja em outro fuso, isso precisará virar configurável por loja.
- `object-contain` nas imagens de produto/banner (commit `6fffe6f`) foi **revertido** (commit `1ba050c`) a pedido do usuário — ficou ruim visualmente. `ProductCard.tsx`, `BannerCarousel.tsx` e as 3 miniaturas de `admin/products/page.tsx` voltaram a `object-cover` (comportamento original, cortando a imagem para preencher o quadro). Não tentar essa troca de novo sem confirmar com o usuário antes.
- Impressão automática (`windows-print-bridge/`): nenhum navegador consegue imprimir silenciosamente numa impressora específica sem algum ajudante local rodando na máquina — isso é bloqueio de segurança do próprio navegador, não uma limitação deste projeto. A solução adotada (ver seção 14) é o bridge local iniciar sozinho e escondido; não existe forma de eliminar esse pequeno processo local a menos que a impressora seja térmica USB compatível com WebUSB (o usuário confirmou que é impressora comum instalada no Windows, então essa alternativa não se aplica aqui).
- Demora de alguns segundos pra carregar a home/PWA: parcialmente resolvido (ver seção 14) via paralelização de fetch + cache curto de catálogo público. **Não descartado**: se o backend no Render estiver em plano free/com auto-sleep, a primeira requisição depois de um período de inatividade pode ter um cold-start de vários segundos a dezenas de segundos — isso não é algo que dá pra resolver só com código no frontend, precisaria de um ping periódico (cron) pro backend ou upgrade de plano no Render. Não foi confirmado com o usuário se esse é o caso.

---

## 14. ÚLTIMA TAREFA

**Tarefa mais recente (topo desta seção):** usuário reportou que cadastro via Google não ficava salvo em "clientes", e pediu pra saber quando é login vs. cadastro novo, pedindo endereço só no primeiro cadastro e nunca mais depois.

**Descoberta importante (arquitetura pré-existente, não introduzida pelo Google login):** `AdminService.listarClientes()` (usado por `GET /admin/clientes` no painel E por `GET /clientes/me` do próprio cliente logado) era montado **inteiramente a partir de `pedidos`** — nunca lia a tabela `clientes` de verdade. Isso significa que QUALQUER cliente cadastrado (Google ou não) que ainda não tivesse feito nenhum pedido ficava completamente invisível — tanto pro admin quanto pra ele mesmo (`GET /clientes/me` retornava 403). O `ClienteEntity` já era criado corretamente no login Google (`GoogleAuthService.localizarOuCriarCliente`); o problema era só de leitura/visibilidade, não de gravação.

Também confirmado: o endereço coletado em `/profile` via `AddressModal` só ia pro `localStorage` (`frontend/src/lib/addresses.ts`) — nunca era enviado ao backend. Não existia nenhum endpoint pra um cliente logado atualizar seu próprio `nome`/`telefone`/`endereco` na tabela real.

Corrigido (commit `a4cde05`):
- `AdminService.listarClientes()`: agora também busca `clienteRepo.listByLoja(lojaId)` e injeta no mapa qualquer cliente cadastrado que ainda não tenha pedido (com `totalPedidos: 0`). Corrige `GET /admin/clientes` (painel) e, em cascata, `GET /clientes/me` (usa a mesma função).
- Novo `PUT /clientes/me` (`client-self.controller.ts` + `admin.service.ts#atualizarPerfilClienteAutenticado`), guardado por `RequireAuth('cliente')`, persiste `nome`/`telefone`/`endereco` de verdade na linha do `ClienteEntity` do usuário autenticado (reaproveita o DTO `AtualizarClienteAdminDto` já existente).
- `google-login-ticket.store.ts`/`google-auth.service.ts`: o ticket de troca agora carrega um flag `novoCadastro: boolean` (true só quando `localizarOuCriarCliente` cria uma linha nova), propagado até a resposta de `POST /auth/google/exchange` (`ClienteLoginResponse.novoCadastro`, campo opcional — não quebra o login tradicional).
- `frontend/src/app/login/google/callback/page.tsx`: se `novoCadastro && !endereco`, mostra o `AddressModal` (mesmo componente já usado em `/profile`) antes de seguir pra `/stores`; ao salvar, chama `PUT /clientes/me` (persistindo de verdade, além de continuar espelhando em localStorage/sessão como antes). Se o usuário fechar sem preencher, segue sem endereço e será perguntado de novo no próximo login (não bloqueia o acesso). Login numa conta que já tem endereço não pede nada — vai direto pra `/stores`.

**Verificação:** `npx tsc --noEmit` limpo no backend e no frontend. **Não testado ao vivo** (sem ambiente rodando localmente nesta sessão) — vale o usuário testar o fluxo completo: cadastro novo via Google → deve pedir endereço uma vez → aparecer em "Clientes" no admin mesmo sem pedido → login de novo não deve pedir endereço de novo.

**Próximo passo:** confirmar com o usuário que o fluxo funciona ponta a ponta em produção. Also vale avaliar se o mesmo problema de visibilidade afeta clientes cadastrados pelo fluxo tradicional (registro por telefone/senha) que ainda não pediram — a correção em `listarClientes()` já cobre esse caso também, já que não é específica do Google.

---

**Histórico anterior desta seção:** usuário reportou demora de alguns segundos pra carregar a tela inicial (home) tanto no PWA quanto no site. Causa concreta encontrada em `frontend/src/app/home/page.tsx`: a função `carregar()` buscava `/catalogo/produtos-mais-pedidos` e depois `/catalogo/produtos` **em sequência** (`await` um, só depois `await` o outro) — duas viagens de rede em série em vez de paralelas. Além disso, tanto o cliente (`frontend/src/lib/api.ts`) quanto o proxy (`frontend/src/app/api/[...path]/route.ts`) forçavam `cache: 'no-store'` em **toda** chamada, então nada nunca era reaproveitado, nem dados de catálogo público que quase não mudam.

Corrigido (commit `d1f7d05`):
- `home/page.tsx`: as duas buscas de produtos agora usam `Promise.allSettled` (paralelas, cada uma com seu próprio tratamento de erro).
- `api.ts`: `api.get()` ganhou um segundo parâmetro opcional `{cache?: RequestCache}`, default continua `'no-store'` (nenhum dos outros ~18 arquivos que usam `api.get` foi afetado).
- `route.ts` (proxy): GETs de `catalogo/categorias`, `catalogo/produtos` e `catalogo/produtos-mais-pedidos` (só esses três, allowlist explícita) ganham `Cache-Control: public, max-age=0, s-maxage=20, stale-while-revalidate=60` em vez de `no-store` — cache curto na borda da Vercel. `catalogo/loja-status` e todo o resto (pedidos, admin, auth) continuam sempre `no-store` de propósito.

**Não resolvido / não confirmado:** se o backend no Render estiver em plano com auto-sleep (free tier), a primeira requisição depois de um tempo parado pode ter cold-start de vários segundos — isso essas mudanças de código **não resolvem**, precisaria de um ping periódico externo pro backend ou upgrade de plano no Render. Não foi confirmado com o usuário se é esse o caso; se a demora persistir mesmo com cache/paralelização, esse é o próximo suspeito.

**Verificação:** `npx tsc --noEmit` limpo no frontend. Não foi possível medir o ganho real de tempo de carregamento nesta sessão (sem ambiente rodando local nem acesso ao Render/Vercel do usuário) — vale o usuário confirmar se a home carregou mais rápido depois do deploy.

**Atualização (causa real do "fica um bom tempo carregando" identificada pela screenshot):** usuário mandou print mostrando o spinner azul girando por bastante tempo logo depois do login. Esse spinner é especificamente da tela `/stores` (`frontend/src/app/stores/page.tsx`) — depois do login, `login/page.tsx` sempre manda pra `/stores`, que fica em `loading: true` (mostrando só o spinner) até `GET /auth/lojas` responder, e **só depois disso** o usuário via precisar apertar num botão pra escolher a loja antes de finalmente ir pra `/home`. Ou seja, a "demora" real era uma tela inteira + uma chamada de rede extra + um toque manual, tudo isso ANTES da home sequer começar a carregar — as otimizações anteriores (paralelizar fetch, cachear catálogo) ajudam a home em si, mas não tocavam nesse gargalo anterior a ela.

Corrigido (commit `e287acf`): como hoje só existe uma loja ativa em produção (Dil Bebidas), quando `GET /auth/lojas` retorna exatamente 1 loja, `/stores` agora pula a tela de escolha e chama `selecionarLoja()` direto, indo pra `/home` sem exigir toque nenhum do usuário. Continua funcionando normalmente (mostrando a lista) se um dia existir mais de uma loja ativa. `auth/lojas` também entrou na mesma allowlist de cache curto de borda (`route.ts`) usada pro catálogo — ajuda em visitas repetidas.

**Próximo passo:** confirmar com o usuário se, depois do deploy, o fluxo ficou visivelmente mais rápido (login → home sem passar pela tela de escolha de loja). Se ainda estiver lento, o suspeito muda de "quantidade de passos/telas" pra "latência real do backend no Render" (cold start ou distância geográfica) — nesse caso a próxima investigação é medir o tempo de resposta puro de `GET /api/auth/lojas` (ex.: aba de rede do navegador) pra confirmar se é a rede ou algo no código.

---

**Histórico anterior desta seção (mais antigo, sessão de impressão térmica/print-bridge — resumo, detalhes completos nos commits):** horário de funcionamento/entrega respeitados de verdade (commit `5617d5f`), depois imagens de produto/banner trocadas de `object-cover` para `object-contain` + fix do prompt de instalação do PWA repetindo mesmo já instalado (commit `6fffe6f`), e em seguida a troca de imagem foi **revertida** a pedido do usuário por ter ficado ruim visualmente (commit `1ba050c`, ver seção 13). Detalhes completos de cada uma dessas mudanças ficaram registrados nos commits e no changelog da seção 16 — não repetidos aqui para não inflar o documento.

**O que estava sendo feito (nesta rodada):** o usuário reportou dois problemas com a impressão automática de cupom (`windows-print-bridge/`):
1. O bridge local "não sincroniza" e o painel fica apontando para `http://127.0.0.1:39876` sem conectar.
2. Para funcionar, é preciso abrir manualmente um prompt/terminal na máquina do admin (`npm start` dentro de `windows-print-bridge/`) — o usuário não quer isso, quer tudo pelo navegador: selecionar a impressora pelo navegador e o pedido sair automaticamente na impressora escolhida assim que chegar.

**Investigação:** ao ler `frontend/src/app/admin/orders/page.tsx` e `frontend/src/lib/print-bridge.ts`, ficou claro que a seleção de impressora pelo navegador e a impressão automática ao chegar pedido **já existiam** (`printViaBridge`, `updateBridgeSettings`, disparo automático em pedido novo). O que faltava:
- `syncBridge()` só rodava quando o admin clicava manualmente no botão "Sincronizar bridge" — nunca automaticamente ao abrir a página nem em retry. Se o bridge caísse ou não tivesse sido iniciado ainda, o painel ficava travado em "não conectado" até alguém lembrar de clicar.
- O bridge (`windows-print-bridge/server.js`) só inicia se alguém abrir um terminal e rodar `npm start` manualmente — não existia nenhuma forma de iniciar sozinho com o Windows.

Perguntei ao usuário (via `AskUserQuestion`) o tipo de impressora (confirmou: impressora comum instalada no Windows, não térmica USB) e se o incômodo principal era o terminal manual (confirmou que sim). Isso descartou a alternativa de reescrever tudo via WebUSB (só valeria a pena para impressora térmica USB) e confirmou o caminho: manter o bridge (nenhum navegador imprime numa impressora específica sem algum ajudante local — é bloqueio de segurança do navegador, não limitação deste projeto), mas fazê-lo iniciar sozinho e escondido.

**Concluído:**
- `frontend/src/app/admin/orders/page.tsx`: novo `useEffect` chama `syncBridge()` ao montar a página e continua tentando a cada `BRIDGE_RETRY_INTERVAL_MS` (20s) enquanto `bridgeOnline` for `false` — antes só sincronizava no clique manual do botão.
- `windows-print-bridge/start-hidden.vbs` (novo): roda `npm start` sem nenhuma janela visível (`WScript.Shell.Run` com `windowStyle 0`).
- `windows-print-bridge/instalar-inicializacao-automatica.ps1` (novo): cria um atalho na pasta de Inicialização do Windows (`shell:startup`) apontando para `start-hidden.vbs`, e já inicia o bridge imediatamente (sem precisar reiniciar a máquina). Não precisa de admin — pasta de Startup é por usuário.
- `windows-print-bridge/remover-inicializacao-automatica.ps1` (novo): desfaz, removendo o atalho.
- `windows-print-bridge/README.md`: documentado o novo fluxo recomendado (rodar o instalador uma vez) e mantido o `npm start` manual só como modo de depuração.

**Resultado esperado para o usuário:** rodar `instalar-inicializacao-automatica.ps1` uma única vez na máquina do admin. Dali em diante, o bridge sobe sozinho e escondido a cada login do Windows, e o painel de pedidos no navegador sincroniza e reconecta sozinho — nunca mais precisa abrir prompt.

**Verificação:** `npx tsc --noEmit` limpo no frontend após a mudança em `orders/page.tsx`. **Não foi possível testar ao vivo** o `.vbs`/`.ps1` nem a sincronização real do bridge nesta sessão (dependem da máquina Windows real do admin com impressora instalada) — o usuário precisa rodar o instalador e confirmar.

**Nota sobre o processo desta sessão:** um hook local ("Fact-Forcing Gate", de um plugin ECC) intercepta `Edit`/`Write`/primeiro `Bash` exigindo uma declaração de fatos antes de cada chamada. Em várias ocasiões (contadas no próprio hook como "denial") a chamada foi bloqueada mas a edição **foi aplicada mesmo assim**, causando imports duplicados em commits anteriores desta sessão — todos identificados pelo `tsc` e corrigidos antes de cada commit. Vale saber que esse hook existe e pode ter esse comportamento inconsistente (denial reportado ≠ edição não aplicada).

**Commits:** a confirmar após esta edição — ver `git log` (deve haver um commit cobrindo `orders/page.tsx` + `windows-print-bridge/*` novo).

**Atualização (impressora):** confirmado com o usuário que a impressora é térmica USB, mas **aparece instalada no Windows com driver próprio** (não é acesso USB cru) — então nada muda na abordagem, o bridge via `Out-Printer` já funciona normalmente com ela.

**Atualização (instalador ficou com 0 bytes / arquitetura trocada para Task Scheduler):** a versão baseada em atalho na pasta Startup (`instalar-inicializacao-automatica.ps1` usando `WScript.Shell.CreateShortcut`) chegou como arquivo de 0 bytes na máquina do usuário — causa exata não confirmada (possível problema de sync/antivírus/encoding no Windows, não reproduzido neste ambiente). O usuário pediu uma reescrita completa e mais robusta, usando o **Agendador de Tarefas do Windows** em vez de atalho na pasta Startup. Reescrito do zero:
- `instalar-inicializacao-automatica.ps1`: resolve tudo por caminho absoluto via `$PSScriptRoot` (funciona em qualquer pasta, ex. Downloads, e não depende do diretório atual do PowerShell); verifica se `node.exe`/`npm` estão no PATH e para com mensagem clara se não estiverem; remove atalho legado da pasta Startup se existir (evita duas instâncias do bridge rodando ao mesmo tempo); cria/recria (nunca duplica) uma tarefa chamada **"Extraplus Windows Print Bridge"** com `Register-ScheduledTask` — trigger `AtLogOn` do usuário atual, `LogonType Interactive`, `RunLevel Limited` (não precisa admin), ação = `wscript.exe start-hidden.vbs` (reaproveita o `.vbs` existente, sem duplicar lógica de inicialização); inicia a tarefa imediatamente com `Start-ScheduledTask`; imprime node path, pasta do projeto, nome da tarefa e status final.
- `remover-inicializacao-automatica.ps1`: reescrito para remover a tarefa agendada (`Unregister-ScheduledTask`) e também limpar o atalho legado da pasta Startup, se sobrar de instalação antiga.
- `README.md`: seções reescritas — instalar, verificar se está rodando (via `/health`, painel admin, `taskschd.msc`, Gerenciador de Tarefas), remover, iniciar manualmente (modo depuração), e diagnosticar problemas comuns.
- `server.js`, `package.json`, `start-hidden.vbs`: **não alterados**, a pedido explícito do usuário (só a orquestração de inicialização automática mudou).
- Ambos os `.ps1` validados com `[System.Management.Automation.Language.Parser]::ParseFile` (parse-only) — sem erro de sintaxe, tamanho de arquivo confirmado não-zero.

**Atualização (instalação no cliente final via ZIP do GitHub):** o cliente que vai usar o bridge não tem o projeto clonado, só baixou o ZIP do repositório (pasta `extraplusdelivery-main (1)\extraplusdelivery-main\windows-print-bridge`) e acessa o resto do sistema via internet/DNS normalmente — fluxo válido, o bridge não depende do resto do projeto. Problemas encontrados e resolvidos nessa instalação real, em sequência:
1. Erro `CommandNotFoundException` ao rodar o instalador — causado por colar a linha inteira do terminal (prompt + comando) de volta no PowerShell, não um bug no script. Resolvido orientando a copiar só o comando.
2. Script bloqueado por política de execução (`scripts foi desabilitada`) e depois por "não está assinado digitalmente" mesmo após `Set-ExecutionPolicy RemoteSigned` — causado pelo "Mark of the Web" que o Windows aplica em arquivos extraídos de ZIP baixado da internet. Resolvido com `Unblock-File` nos `.ps1` (ou `powershell -ExecutionPolicy Bypass -File ...` como alternativa sem alterar política do sistema).
3. Depois de instalado e com o bridge respondendo corretamente (`GET /health` retornando `{"ok":true,...,"printersAvailable":8}` quando testado direto), o botão "Sincronizar bridge" no painel continuava falhando, com erro no console do Chrome: `Access to fetch at 'http://127.0.0.1:39876/health' from origin 'https://www.dilbebidas.com.br' has been blocked by CORS policy: Request had a target IP address space of local yet the resource is in address space loopback.` — **bug real no código**, não do usuário: `frontend/src/lib/print-bridge.ts` declarava `targetAddressSpace: 'local'` na opção do `fetch()`, mas o Chrome trata `127.0.0.1` como a categoria mais restrita `'loopback'` (distinta de `'local'`, usada para IPs privados tipo `192.168.x.x`), então a Private Network Access do navegador rejeitava a requisição por incompatibilidade declarada. Corrigido no commit `0dfc961` trocando para `targetAddressSpace: 'loopback'`. Não foi necessário mexer no `server.js` (o header `Access-Control-Allow-Private-Network: true` que ele já envia continua correto, o problema era só do lado do fetch no navegador).

**Atualização (cupom saindo quebrado, 1 caractere por linha):** com o bridge já sincronizando (fix de CORS acima), o próximo problema real foi visual: o cupom impresso na térmica de 57mm saía quebrando quase a cada caractere (`DIL / BE / BID / AS`...). Causa raiz: `printText()` em `windows-print-bridge/server.js` usava `Get-Content | Out-Printer`, que renderiza o texto via GDI com a fonte padrão do driver — para bobina de 57mm essa fonte é grande demais, sobrando só ~3-4 caracteres por linha física, então até um bloco curto de texto virava várias linhas quebradas no meio da palavra. Não era um problema de "largura configurada errada" no código (não havia nenhuma constante `paperWidth`/`columns` etc. — o texto era só concatenado sem nenhuma formatação de largura), era o transporte de impressão (GDI) sendo inadequado para térmica.

Correção (duas partes, arquitetura correta: dado estruturado formata no frontend, transporte formata no bridge):
- `frontend/src/app/admin/orders/page.tsx`: `buildBridgeReceiptText()` reescrita com largura fixa de **32 colunas** (`RECEIPT_WIDTH_CHARS`, valor seguro/compatível pra bobina 57/58mm na fonte padrão ESC/POS Font A — não é "57mm = 57 caracteres", depende da fonte/DPI da impressora). Novas funções auxiliares: `wrapReceiptWords` (quebra só entre palavras, nunca no meio, só quebra uma palavra sozinha se ela for maior que a largura toda), `centerReceiptLine` (cabeçalho centralizado), `rightAlignReceiptPair` (TOTAL alinhado à direita), `receiptSeparator`, `stripAccentsForPrint` (remove acentos via `normalize('NFD')` + filtro de code point, necessário porque impressão RAW não passa pela conversão de codepage do Windows). Itens do pedido ganharam quebra com indentação pendurada (`Nx Nome` na primeira linha, continuação alinhada embaixo do nome). Nota: só há `quantity`+`name` por item no `BackendOrderItem` (sem preço unitário), então a coluna de valor por item do exemplo do usuário não foi replicada — só o TOTAL geral, que já existia.
- `windows-print-bridge/server.js`: `printText()` trocado de `Out-Printer` (GDI) para impressão **RAW ESC/POS** — bytes enviados direto pro spooler via `winspool.drv` (`OpenPrinter`/`StartDocPrinter` com datatype `"RAW"`/`WritePrinter`/etc, um C# `RawPrinterHelper` compilado on-the-fly via `Add-Type` dentro do script PowerShell chamado por `execPowerShell`), bypassando completamente o renderizador de texto do driver. Novo `buildEscPosReceipt()` monta os bytes: `ESC @` (inicializa) + linhas do texto (já vem formatado/quebrado do frontend) + alimentação de papel + `GS V 66 0` (corte parcial). Resposta do endpoint `/print-text` mudou o campo informativo `mode` de `'text-out-printer'` para `'escpos-raw'` (não há nada no frontend lendo esse valor, então é seguro). `README.md` atualizado explicando a mudança e onde ajustar a largura se a impressora usada tiver fonte diferente.
- Nada na lógica de pedido/produto/cliente/comunicação com o backend foi alterado — só a formatação e o transporte de impressão, como pedido explicitamente.
- Verificação feita nesta sessão (sem impressora real disponível): `npx tsc --noEmit` limpo no frontend; `node --check` limpo no `server.js`; simulação isolada do algoritmo de wrap rodada via Node confirmando 32 colunas, sem overflow, sem quebra no meio de palavra, cabeçalho centralizado e TOTAL alinhado à direita; o script PowerShell exato que `server.js` gera em tempo de impressão foi extraído e validado com `[System.Management.Automation.Language.Parser]::ParseFile` (sintaxe OK) e o C# `RawPrinterHelper` foi de fato compilado via `Add-Type` nesta máquina (compilação OK) — mas a chamada real `SendBytesToPrinter` (que fala com a impressora de verdade) não foi testada em hardware físico.

**Atualização (largura virou configuração editável):** usuário reportou que o cupom "ainda saiu do mesmo jeito" após o fix de largura fixa em 32 colunas. Ponto crítico identificado: `windows-print-bridge/server.js` roda de um arquivo **local** na máquina do cliente (baixado do ZIP do GitHub), **não é deploy automático** como o frontend na Vercel — se o cliente não baixar a versão nova e reiniciar o bridge, qualquer fix no `server.js` não tem efeito nenhum, o que é a explicação mais provável do "mesmo jeito" (o frontend sim já atualiza sozinho via Vercel, mas o `server.js` não). Diferente do frontend, mudanças em `windows-print-bridge/` sempre exigem o cliente baixar de novo e (se for `server.js`) reiniciar o bridge (reiniciar Windows ou `Stop-ScheduledTask`/`Start-ScheduledTask -TaskName "Extraplus Windows Print Bridge"`).

Além disso, para não depender de mais um ciclo de deploy+redownload cada vez que uma impressora tiver uma fonte ESC/POS diferente (32 colunas não é universal — depende do driver/fonte de cada impressora), a largura virou uma **configuração editável no painel**, não mais uma constante fixa só no código:
- `windows-print-bridge/server.js`: novo campo `charactersPerLine` nas settings persistidas (`GET/PUT /settings`), validado/clampado entre 16 e 80 (`normalizeCharactersPerLine`), default 32. Correção lateral necessária: o `PUT /settings` antes sempre sobrescrevia `selectedPrinterName` com `''` se o body não mandasse esse campo — isso quebraria a impressora selecionada toda vez que só a largura fosse salva; corrigido pra usar `loadSettings()` como base e só sobrescrever os campos realmente enviados.
- `frontend/src/lib/print-bridge.ts`: `BridgeSettings` ganhou `charactersPerLine: number`.
- `frontend/src/app/admin/orders/page.tsx`: novo estado `receiptWidth` (carregado de `settings.charactersPerLine` no `syncBridge()`), campo numérico editável (16–80) na mesma seção da seleção de impressora, `handleReceiptWidthChange()` salva via `updateBridgeSettings({charactersPerLine})`. `buildBridgeReceiptText(order, width)` agora recebe a largura como parâmetro (default `RECEIPT_WIDTH_CHARS = 32` se não vier nada).

**Atualização (confirmado: bridge antigo continua rodando na máquina do cliente):** usuário mandou foto do cupom impresso — continua idêntico ao problema original (quebra por caractere) e com `"nÃ°"` no lugar de "número", um erro clássico de encoding UTF-8/mojibake. Isso é prova definitiva de que o `server.js` **antigo** ainda está rodando: o código novo remove acentos antes de imprimir (`stripAccentsForPrint`), então esse tipo de garbage é literalmente impossível de sair da versão nova. Confirma a suspeita já registrada acima — o cliente não substituiu os arquivos locais nem reiniciou o bridge.

Adicionado um jeito de verificar isso sem precisar imprimir nada: `GET /health` agora retorna `version: '1.1.0'`, `printMode: 'escpos-raw'` e `charactersPerLine` (antes só tinha `version: '1.0.0'` fixo, sem nenhum campo que diferenciasse a versão nova da antiga). `README.md` ganhou uma entrada de diagnóstico especificamente pra esse sintoma (cupom quebrado + acento virando símbolo = bridge desatualizado), instruindo a conferir esses campos em `http://127.0.0.1:39876/health`.

**Próximo passo:** orientar o cliente a fazer uma reinstalação limpa: apagar as pastas antigas extraídas (a duplicada "(1)" e a original), baixar o ZIP de novo do zero, extrair uma única vez, rodar `instalar-inicializacao-automatica.ps1` de novo (idempotente, reaponta a tarefa agendada pra pasta nova), e **antes de testar impressão**, abrir `http://127.0.0.1:39876/health` e confirmar `version: "1.1.0"` — só depois disso testar um pedido de verdade.

**Onde continuar:** depende da confirmação do usuário sobre o item acima, ou da próxima solicitação. `git status` deve mostrar só a diferença pendente de `backend/tsconfig.json` (line-ending, intencionalmente não commitada), a pasta local `.claude/` e arquivos soltos `bash.exe.stackdump`/`frontend/bash.exe.stackdump` (artefatos de crash do Git Bash, lixo, não versionados).

---

## 15. PRÓXIMOS PASSOS (sugestões, não confirmadas como prioridade pelo usuário)

1. Confirmar com o usuário se a home carregou mais rápido depois do deploy do commit `d1f7d05`; se a demora persistir, investigar se o backend no Render tem auto-sleep (cold start) — precisaria de ping periódico externo ou upgrade de plano.
1b. Usuário rodar `windows-print-bridge/instalar-inicializacao-automatica.ps1` na máquina do admin e confirmar que o bridge conecta sozinho, sem terminal, e a impressão automática funciona ao chegar pedido.
2. Validar em produção: loja mostra "Fechada" e bloqueia pedido depois do horário configurado; horário de entrega bloqueia só delivery (retirada continua liberada); "Horários" no admin salva e recarrega corretamente do backend.
3. Confirmar com o usuário se "Pausar chegada de pedidos" está bloqueando o checkout como esperado em produção (teste de ponta a ponta pelo app do cliente).
4. Decidir se vale a pena criar uma tela de autoatendimento para o cliente completar telefone/endereço (relevante principalmente para contas criadas via Google).
5. Avaliar se `ADmin/` (pasta legada) e a dependência `firebase` não usada devem ser removidas.
6. Confirmar se sobrou algum pedido de teste em produção para limpar via `/platform`.

---

## 16. HISTÓRICO RESUMIDO (changelog cronológico desta sessão)

1. `88e3324` — feat: categorias Gelos/Vinhos e importação de produtos via CSV
2. `f2d27e6` — fix: menu de ações de produtos cortado + visualização em lista/seleção múltipla
3. `9acf977` — fix: clique em categoria não filtrava + coluna "Qtd. no Fardo" no CSV
4. `917a32e` — feat: login social com Google (backend + frontend completos)
5. `d753f0b` — fix: 404 no callback do Google (exclusão de prefixo `/api`)
6. `daccec3` — feat: cadastro estruturado de endereço + localização via WhatsApp no pedido
7. `04cfc37` — fix: 400 ao finalizar pedido com telefone/endereço vazios
8. `0b759ff` — feat: chave PIX e instrução de comprovante via WhatsApp
9. `8a3135e` — feat: remover/ajustar quantidade no carrinho + fix de persistência
10. `9c8603a` — feat: "pausar pedidos" bloqueando checkout de verdade
11. `78dde50` — feat: platform ganha "zerar pedidos" do cliente e editar usuário/senha do lojista
12. `126bd4e` — feat: platform lista todos os pedidos com seleção manual para apagar
13. `64f4776` — fix: carrinho adaptado ao tema escuro
14. `2d3224f` — fix: preço de fardo cobrando valor unitário incorreto
15. `4678d10` — feat/fix: categorias Petiscos/Gin/Whisky/Diversos + "Mais pedidos" some com categoria selecionada na Home + filtro de categoria do admin de produtos (que nunca funcionou) agora é um `<select>` real
16. `054f2f3` — docs: cria/atualiza `CONTEXTO_PROJETO.md` (commit 15)
17. `41bd2f0` — fix: botão de menu do admin mobile ficava atrás do botão de tema
18. `5617d5f` — feat: sistema respeita horário de funcionamento e adiciona horário de entrega
19. `6fffe6f` — fix: imagens de produto/banner não cortam mais e PWA não pede instalação se já instalado
20. `1ba050c` — revert: volta imagens de produto/banner para object-cover
21. `fe57b72` — docs: registra reversão do object-contain nas imagens no CONTEXTO_PROJETO.md
22. `4baa4eb` — feat: bridge de impressão inicia sozinho e escondido + painel sincroniza automaticamente
23. `0a04d4d` — fix: corrige erro de sintaxe no instalador do print-bridge (aspas escapadas com backtick se perdiam ao copiar/colar; trocado por variável com string já entre aspas)
24. `e0bd74a` — docs: registra instalação real no cliente e fix do bloqueio de CORS (loopback) no print-bridge
25. `edcba95` — fix: cupom térmico 57mm não quebra mais caractere por caractere
26. `a8112ca` — feat: largura do cupom térmico vira configuração editável no painel
27. `74de8df` — docs: registra largura editável do cupom e alerta sobre bridge não ter deploy automático
28. `26dd27a` — feat: expõe versão/modo de impressão no /health do print-bridge
29. `6a24204` — docs: confirma bridge antigo ainda rodando no cliente e registra fix do marcador de versão
30. `d1f7d05` — perf: acelera carregamento da home paralelizando fetch e cacheando catálogo público
31. `e287acf` — perf: pula tela de escolha de loja quando só há uma loja ativa
32. `a4cde05` — feat: cadastro via Google fica visível na base de clientes e pede endereço no primeiro acesso

Todos os commits foram enviados para `origin/main` no repositório GitHub oficial do projeto.

---

## COMO CONTINUAR

Leia este arquivo antes de analisar o projeto. Ele representa o estado conhecido do projeto até o último ponto desta conversa. Não refaça análises que já estão documentadas aqui. Primeiro compare o estado atual do código com este documento (ex.: `git log`, `git status`) e só então investigue o que estiver relacionado à próxima tarefa pedida pelo usuário. Se este documento e o código divergirem em algum ponto, **confie no código** e trate a divergência como um sinal de que este documento está desatualizado nesse trecho específico.
