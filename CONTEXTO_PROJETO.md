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

---

## 14. ÚLTIMA TAREFA

**O que estava sendo feito:** corrigir o botão de abrir o menu do admin no mobile, que ficava no canto superior direito, escondido atrás do botão flutuante de tema (`ThemeToggle`, `fixed top-3 right-3 z-50`).

**Concluído:**
- `admin/layout.tsx`: header mobile reordenado — botão de menu agora é o primeiro elemento (esquerda), seguido da logo/nome da loja, sem mais usar `justify-between` nessa linha.
- Typecheck e lint limpos (só warning pré-existente não relacionado, de `useEffect` em outra parte do mesmo arquivo).
- Commit `41bd2f0` criado e enviado (`git push origin main`).
- Este arquivo de contexto atualizado no mesmo commit/push.

**Pendente:** nenhuma alteração de código pendente. **Não foi feita verificação visual ao vivo no navegador** (só typecheck/lint/leitura de código) — vale o usuário confirmar no celular que o botão ficou visível e clicável do jeito esperado.

**Próximo passo:** não há uma próxima tarefa definida pelo usuário ainda.

**Onde continuar:** depende da próxima solicitação do usuário. Não há trabalho em andamento inacabado no código neste momento. `git status` deve mostrar só a diferença pendente de `backend/tsconfig.json` (line-ending, intencionalmente não commitada), a pasta local `.claude/` (config de dev server local) e arquivos soltos `bash.exe.stackdump` (artefato de crash do Git Bash, lixo, não versionado, não relacionado a nenhuma feature).

---

## 15. PRÓXIMOS PASSOS (sugestões, não confirmadas como prioridade pelo usuário)

1. Confirmar com o usuário se "Pausar chegada de pedidos" está bloqueando o checkout como esperado em produção (teste de ponta a ponta pelo app do cliente).
2. Validar autoimpressão com impressora/bridge real.
3. Decidir se vale a pena criar uma tela de autoatendimento para o cliente completar telefone/endereço (relevante principalmente para contas criadas via Google).
4. Avaliar se `ADmin/` (pasta legada) e a dependência `firebase` não usada devem ser removidas.
5. Confirmar se sobrou algum pedido de teste em produção para limpar via `/platform`.

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

Todos os commits foram enviados para `origin/main` no repositório GitHub oficial do projeto.

---

## COMO CONTINUAR

Leia este arquivo antes de analisar o projeto. Ele representa o estado conhecido do projeto até o último ponto desta conversa. Não refaça análises que já estão documentadas aqui. Primeiro compare o estado atual do código com este documento (ex.: `git log`, `git status`) e só então investigue o que estiver relacionado à próxima tarefa pedida pelo usuário. Se este documento e o código divergirem em algum ponto, **confie no código** e trate a divergência como um sinal de que este documento está desatualizado nesse trecho específico.
