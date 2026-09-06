# 🍕 Burger & Pizza House — ERP

Sistema de gestão (ERP) para pizzarias e hamburguerias: pedidos, produtos, estoque, dashboard com indicadores em tempo real e autenticação segura.

O backend é uma API REST em **Node.js + Express + Prisma + SQLite**. Há dois frontends no repositório:

| Frontend | Stack | Status |
|---|---|---|
| **`frontend-angular/`** | **Angular 20** (standalone components) + Tailwind CSS v4 | ✅ Atual — recomendado |
| `frontend/` | React 18 + Vite | 🗂️ Legado — mantido para referência/comparação |

Os dois consomem a **mesma API** e implementam as mesmas telas, com o mesmo design visual (mesma paleta, tipografia e componentes), então dá pra rodar qualquer um dos dois contra o backend sem nenhuma alteração.

---

## 📷 Preview

<div align="center">

| Dashboard | Produtos |
|---|---|
| <img src="./frontend/public/dashboard.png" width="450"/> | <img src="./frontend/public/produtos.png" width="450"/> |

| Pedidos | Estoque |
|---|---|
| <img src="./frontend/public/pedidos.png" width="450"/> | <img src="./frontend/public/estoque.png" width="450"/> |

</div>

> As capturas acima foram feitas na versão React, mas a versão Angular reproduz o mesmo layout e paleta — veja a seção [Design system](#-design-system) para detalhes.

---

## ✨ Funcionalidades

**📊 Dashboard** — receita do dia, receita total, ticket médio, total de pedidos, produtos mais vendidos, gráfico de faturamento por período, pedidos recentes e alerta de estoque crítico.

**📦 Produtos** — cadastro, edição, exclusão (soft delete), busca por nome, categorias e controle de preço/custo.

**🛒 Pedidos** — carrinho de itens, dados do cliente, desconto, taxa de entrega, forma de pagamento, alteração de status com transições validadas e histórico completo.

**🥬 Estoque** — cadastro de ingredientes, controle de quantidade, estoque mínimo configurável, alertas visuais e baixa automática ao confirmar pedidos.

**🔐 Autenticação** — login com JWT em cookie `httpOnly`, rotas protegidas e controle de sessão.

**🎨 Interface** — layout responsivo, sidebar recolhível, tema claro/escuro/automático, feedback visual (toasts) e atalhos de teclado.

---

## 🛠️ Tecnologias

### Backend

| Tecnologia | Uso |
|---|---|
| Node.js + Express | API REST |
| TypeScript | Linguagem |
| Prisma ORM | Acesso ao banco |
| SQLite | Banco de dados |
| JWT + Bcrypt | Autenticação e hash de senha |
| Zod | Validação de entrada |
| Jest + ts-jest | Testes automatizados |

### Frontend (Angular — atual)

| Tecnologia | Uso |
|---|---|
| Angular 20 | Framework (standalone components, signals) |
| Tailwind CSS v4 | Estilização (mesmo design system do React) |
| `@lucide/angular` | Ícones |
| `date-fns` | Formatação de datas (locale `pt-BR`) |
| RxJS + `HttpClient` | Comunicação com a API |

### Frontend (React — legado)

| Tecnologia | Uso |
|---|---|
| React 18 + Vite | Interface e build |
| TailwindCSS v3 | Estilização |
| Axios + React Router | API e rotas |
| Recharts | Gráfico do dashboard |

---

## 📂 Estrutura

```text
Burger-Pizza-House
│
├── backend
│   ├── prisma                  # schema.prisma, migrations, seed
│   ├── src
│   │   ├── controllers
│   │   ├── middlewares
│   │   ├── routes
│   │   ├── schemas              # validação Zod
│   │   └── server.ts
│   └── package.json
│
├── frontend-angular             # ⭐ frontend atual (Angular)
│   ├── src
│   │   ├── app
│   │   │   ├── core              # models, services, guards, interceptors
│   │   │   ├── shared            # componentes reutilizáveis (badge, empty state, toast, gráfico...)
│   │   │   ├── layout            # shell com sidebar + topbar
│   │   │   ├── pages             # login, dashboard, products, orders, ingredients, not-found
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   ├── environments          # apiUrl (dev/prod)
│   │   └── styles.css            # design tokens do Tailwind v4 (@theme)
│   ├── proxy.conf.json           # redireciona /api -> localhost:5000 em dev
│   └── package.json
│
└── frontend                     # frontend legado (React), mantido por referência
    ├── src
    │   ├── components / hooks / layouts / pages / services
    │   └── main.tsx
    └── package.json
```

---

## 🚀 Instalação e execução

### Pré-requisitos

- Node.js **20+** (recomendado 22)
- npm

### 1. Clone

```bash
git clone https://github.com/adanwilliamdev/Burger-Pizza-House.git
cd Burger-Pizza-House
```

### 2. Backend

```bash
cd backend
npm install

cp .env.example .env

npx prisma generate
npx prisma migrate dev
npm run seed

npm run dev
```

A API sobe em `http://localhost:5000` (todas as rotas ficam sob o prefixo `/api`, ex.: `http://localhost:5000/api/products`).

> **Windows + erro `Cannot read properties of undefined (reading 'fileExists')` no ts-node?** Isso acontece quando existe um `ts-node` instalado globalmente com versão incompatível. Este projeto já contorna isso via `nodemon.json`. Se ainda ocorrer, rode `npm uninstall -g ts-node`.

> **Ambientes com rede restrita (proxies corporativos, sandboxes de CI):** o `prisma generate`/`migrate` baixa os binários da engine de `binaries.prisma.sh` na primeira execução. Se esse domínio estiver bloqueado, os comandos acima falham com `403 Forbidden` — isso **não é um problema no código**, é a engine do Prisma não conseguindo baixar seu binário nativo. Libere o domínio ou rode esses dois comandos em uma máquina com acesso normal à internet antes de subir o servidor.

### 3. Frontend Angular (recomendado)

Em outro terminal, com o backend já rodando:

```bash
cd frontend-angular
npm install
npm start
```

Abre em `http://localhost:4200`. O `npm start` já sobe com `--proxy-config proxy.conf.json`, que redireciona as chamadas `/api/*` para `http://localhost:5000` — não precisa configurar CORS extra em desenvolvimento.

Build de produção:

```bash
npm run build
```

Gera os arquivos estáticos em `dist/frontend-angular/browser`. Antes de publicar, ajuste `src/environments/environment.prod.ts` com a URL real da sua API (o build de produção usa esse arquivo automaticamente via `fileReplacements` no `angular.json`).

### 4. Frontend React (legado, opcional)

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173`.

---

## ⚙️ Variáveis de ambiente

Backend (`backend/.env`):

```env
DATABASE_URL="file:./dev.db"

JWT_SECRET=your_secret_key

PORT=5000

# Origens permitidas para CORS, separadas por vírgula
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://localhost:4200
```

> Adicione `http://localhost:4200` (porta padrão do Angular) à lista de `CORS_ORIGIN` se for acessar a API diretamente sem passar pelo proxy do Angular CLI (por exemplo, ao rodar `ng build` + servir os estáticos separadamente).

Frontend Angular (`frontend-angular/src/environments/environment.ts` e `environment.prod.ts`):

```ts
export const environment = {
  production: false,
  apiUrl: '/api', // em dev, o proxy.conf.json redireciona para o backend
};
```

---

## 🔑 Credenciais

| Campo | Valor |
|---|---|
| Email | `admin@burgerpizzahouse.com` |
| Senha | `admin123` |

> Credenciais de um ambiente de demonstração/desenvolvimento, criadas pelo `npm run seed`. Não reutilize essa senha em um deploy público.

---

## ⌨️ Atalhos de teclado

Implementados em ambos os frontends (Angular e React):

| Atalho | Ação |
|---|---|
| `Ctrl`/`Cmd` + `K` | Foca no campo de busca do topbar |
| `Ctrl`/`Cmd` + `N` | Vai para Produtos |
| `Ctrl`/`Cmd` + `P` | Vai para Pedidos |

---

## 🎨 Design system

Ambos os frontends compartilham o mesmo design system (cores, tipografia, sombras, componentes):

- **Cor primária**: laranja `#F97316` (hover `#EA580C`)
- **Cores de status**: sucesso (`#22C55E`), erro (`#EF4444`), aviso (`#F59E0B`), info (`#3B82F6`)
- **Tema escuro** ativado por classe `.dark` na raiz do documento (persistido em `localStorage`)
- **Componentes**: cards, badges de status, tabelas, modais, inputs e botões com os mesmos tokens visuais

Na versão Angular, esses tokens vivem em `frontend-angular/src/styles.css`, usando a sintaxe `@theme` do Tailwind v4 (em vez do `tailwind.config.js` usado pela versão React em Tailwind v3).

---

## 🔒 Segurança

Medidas aplicadas na API (backend), válidas para os dois frontends:

- **Criação de usuários restrita a administradores** — `POST /api/auth/register` exige um token de um usuário `ADMIN` autenticado. O primeiro admin é criado pelo `npm run seed`.
- **Token JWT em cookie `httpOnly`**, não em `localStorage` — reduz a superfície de roubo de sessão via XSS. `POST /api/auth/logout` limpa o cookie no servidor.
- **`JWT_SECRET` obrigatório e com checagem de força mínima** — o servidor recusa subir se a variável não existir ou for muito curta/óbvia.
- **Validação de entrada com Zod** em todas as rotas de escrita (auth, produtos, ingredientes e pedidos).
- **Rate limiting**: `/api/auth/login` aceita no máximo 10 tentativas a cada 15 minutos por IP; as demais rotas têm limite geral de 300 requisições/15min.
- **Helmet** aplicando cabeçalhos HTTP de segurança padrão.
- **CORS configurável** via `CORS_ORIGIN` no `.env`, com `credentials: true` para permitir o cookie de sessão entre origens diferentes.
- **Criação de pedido em transação atômica** (`prisma.$transaction`) — numeração sequencial, checagem de estoque e baixa de ingredientes acontecem juntas, sem condição de corrida nem pedido "pela metade".
- **Checagem de estoque antes de confirmar o pedido** — se faltar ingrediente, o pedido inteiro é rejeitado (`409`) com a lista de itens em falta.
- **Transições de status validadas** — `PATCH /api/orders/:id/status` só aceita mudanças que fazem sentido no fluxo operacional.
- **Exclusão segura de produtos e ingredientes** — produtos com pedidos associados são desativados (soft delete); ingredientes referenciados por algum produto não podem ser excluídos.
- **Mensagens de erro reduzidas em produção** — com `NODE_ENV=production`, erros 5xx inesperados retornam mensagem genérica ao cliente.
- **Regras de negócio no backend** — o `discount` de um pedido nunca pode superar o subtotal; `discount` e `deliveryFee` são validados como não-negativos.
- **Rotas protegidas no frontend** — nos dois frontends, páginas internas redirecionam para `/login` quando não há usuário autenticado (guard de rota no Angular, `ProtectedRoute` no React), sem depender só do 401 da API.
- **Banco local fora do controle de versão** — `*.db`/`*.sqlite` estão no `.gitignore`.

---

## 🧪 Testes e verificação

```bash
cd backend
npm test
```

30 testes automatizados (Jest + ts-jest):

- **Schemas de validação**: payloads válidos/inválidos de login, registro e criação de pedido.
- **`OrderController`**: criação de pedido com estoque suficiente/insuficiente, produto inativo, desconto maior que o subtotal, transições de status válidas/inválidas — com Prisma mockado.
- **`errorHandler`**: erros 5xx genéricos ocultados em produção, erros de negócio mantendo a mensagem original, detalhes do Prisma não vazando.

**O que foi verificado ao preparar esta versão:**

- ✅ `backend`: `npm install`, `npx tsc --noEmit` e os 30 testes do Jest passam.
- ✅ `frontend-angular`: `npm install` e `ng build` (produção) concluem sem erros, com lazy-loading por página.
- ✅ `frontend` (React, legado): `npm install` e `npm run build` continuam funcionando sem alterações.
- ⚠️ `npx prisma generate`/`migrate dev` **não pôde ser executado no ambiente onde este projeto foi preparado**, por bloqueio de rede ao domínio `binaries.prisma.sh` — não é um erro do código. Rode esses dois comandos normalmente na sua máquina (veja o aviso na seção de instalação do backend).

---

## 📌 API

Todas as rotas abaixo estão sob o prefixo `/api`.

### Autenticação

```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/register   (requer token de ADMIN)
```

### Produtos

```
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

### Pedidos

```
GET   /api/orders
POST  /api/orders
PATCH /api/orders/:id/status
```

### Estoque (ingredientes)

```
GET  /api/ingredients
POST /api/ingredients
PUT  /api/ingredients/:id
```

### Dashboard

```
GET /api/dashboard/stats
GET /api/dashboard/revenue?days=7
```

---

## 📜 Scripts

### Backend

```bash
npm run dev      # servidor com hot-reload
npm run build    # compila TypeScript
npm start        # roda o build compilado
npm run seed     # popula o banco com dados de demonstração
npm test         # roda os testes (Jest)
npx prisma studio  # abre o painel visual do banco
```

### Frontend Angular

```bash
npm start        # ng serve com proxy para o backend (localhost:4200)
npm run build    # build de produção em dist/frontend-angular
npm run watch    # build em modo desenvolvimento com watch
npm test         # ng test (Karma + Jasmine — requer Chrome/Chromium instalado)
```

### Frontend React (legado)

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## 🚧 Roadmap

- [ ] Relatórios em PDF
- [ ] Exportação Excel
- [ ] Integração com impressora térmica
- [ ] Multiempresa e RBAC
- [ ] Integração iFood / WhatsApp
- [ ] Gateway Pix / Cartão
- [ ] PWA
- [ ] Backup automático
- [ ] Programa de fidelidade

---

## 🤝 Contribuindo

```bash
git checkout -b feature/minha-feature
git commit -m "Minha feature"
git push origin feature/minha-feature
```

Depois, abra um Pull Request.

---

## 📄 Licença

Distribuído sob a licença MIT.

---

## 👨‍💻 Autor

**Adan William Oliveira Santos**

- GitHub: https://github.com/adanwilliamdev
- LinkedIn: https://www.linkedin.com/in/awosantos
- Portfólio: https://adanwilliamdev.github.io/

---

<div align="center">

### 🍕 Burger & Pizza House ERP

Sistema moderno para gestão de pizzarias e hamburguerias.

Backend em Node.js/Express/Prisma, com frontend em Angular (atual) e React (legado).

</div>
