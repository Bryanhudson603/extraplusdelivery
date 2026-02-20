# Extraplus Delivery

Aplicação completa de delivery de bebidas, com **app do cliente** focado em mobile/PWA e **painel do lojista** para gestão de pedidos, produtos, clientes e entregadores.

Este repositório é dividido em duas partes:

- `backend/` – API em NestJS (Node) com dados em memória (e opcionalmente Postgres via TypeORM).
- `frontend/` – App em Next.js 14 (App Router) com interface para cliente e painel admin.

---

## Tecnologias principais

- **Backend**
  - Node.js / TypeScript
  - NestJS 10
  - TypeORM + Postgres (opcional, via variáveis de ambiente)

- **Frontend**
  - Next.js 14 / React 18
  - Tailwind CSS
  - PWA (manifesto + service worker + prompt de instalação)

---

## Como rodar o backend

Pré‑requisitos:

- Node 18+
- (Opcional) Postgres rodando, se quiser usar banco real

Passos:

```bash
cd backend
npm install

# Ambiente de desenvolvimento (hot reload)
npm run start:dev

# Ou build + produção
npm run build
npm run start
```

A API sobe por padrão em `http://localhost:3000/api`.

### Configuração opcional de Postgres

Se quiser usar banco de dados, defina as variáveis de ambiente antes de rodar:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`

Se essas variáveis não estiverem definidas, o backend usa apenas armazenamento em memória.

---

## Como rodar o frontend

Pré‑requisitos:

- Node 18+

Passos:

```bash
cd frontend
npm install

# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

Por padrão o frontend roda em `http://localhost:3001`.
Ele consome o backend através de `http://<hostname>:3000/api`, onde `<hostname>` é detectado do `window.location.hostname`.

---

## PWA (Aplicativo instalável)

O app do cliente foi preparado como PWA:

- Manifesto em `frontend/public/manifest.webmanifest`
- Service worker em `frontend/public/sw.js`
- Registro automático do SW e prompt de instalação em:
  - `frontend/src/components/PwaInstaller.tsx`
  - `frontend/src/components/PwaPrompt.tsx`

Em **produção com HTTPS**, navegadores compatíveis (como Chrome/Android) irão oferecer a instalação do app direto da interface, além do menu “Adicionar à tela inicial”.

Em ambiente de desenvolvimento acessando por IP (ex.: `http://192.168.x.x:3001`), alguns navegadores limitam a instalação automática; nesse caso é normal instalar apenas pelo menu do navegador.

---

## Estrutura de rotas principais

### Cliente

- `/login` – Login/cadastro do cliente
- `/stores` – Escolha de loja
- `/home` – Home com destaques e produtos
- `/catalog` – Busca e catálogo completo
- `/orders` – Histórico de pedidos
- `/profile` – Perfil, endereços e carteira

### Admin (Lojista)

- `/admin/login` – Login do painel
- `/admin` – Dashboard com visão geral da loja
- `/admin/orders` – Pedidos em tempo real
- `/admin/products` – Cadastro e edição de produtos
- `/admin/customers` – Clientes, pedidos e cupons
- `/admin/reports` – Relatórios de vendas por dia e entregas por entregador
- `/admin/settings` – Configurações da loja, delivery, formas de pagamento etc.

No desktop, o painel admin possui **sidebar fixa à esquerda** e o conteúdo ao lado direito. Em telas menores (celular) o menu vira um drawer acessado por botão.

---

## Como subir para o GitHub

No diretório raiz do projeto (`Extraplus/`), execute os comandos abaixo
apenas uma vez para configurar o repositório remoto e enviar o código.

> Substitua `main` pelo nome de branch que preferir, se necessário.

```bash
cd Extraplus

# Inicializar repositório Git (se ainda não existir)
git init

# Adicionar o remoto do GitHub
git remote add origin https://github.com/Bryanhudson603/extraplusdelivery.git

# Adicionar arquivos e criar o primeiro commit
git add .
git commit -m "chore: primeiro commit do Extraplus Delivery"

# Definir branch principal e enviar para o GitHub
git branch -M main
git push -u origin main
```

Nas próximas alterações, basta:

```bash
git add .
git commit -m "feat: descrição da mudança"
git push
```

---

## Licença

Defina aqui a licença do projeto (por exemplo, MIT ou outra de sua escolha).

