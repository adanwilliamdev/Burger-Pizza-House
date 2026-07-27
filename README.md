# 🍕🍔 Burger & Pizza House — ERP

Sistema de gestão (ERP) para pizzarias e hamburguerias: produtos, pedidos e controle de estoque, com dashboard de métricas em tempo real.

## Stack

**Backend**
- Node.js + Express + TypeScript
- Prisma ORM + SQLite
- JWT para autenticação

**Frontend**
- React + TypeScript + Vite
- Tailwind CSS (design system próprio)
- Recharts (gráficos)
- React Router

## Estrutura do projeto

```
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # modelos do banco (User, Product, Order, Ingredient...)
│   └── src/
│       ├── controllers/       # regras de negócio
│       ├── routes/            # endpoints da API
│       ├── middlewares/       # autenticação (JWT)
│       └── seed.ts            # popula o banco com dados iniciais
└── frontend/
    └── src/
        ├── pages/              # Dashboard, Products, Orders, Ingredients, Login
        ├── layouts/            # Layout (sidebar + header)
        ├── components/         # componentes reutilizáveis (EmptyState, Skeleton, StatusBadge)
        ├── hooks/               # AuthContext, ThemeContext (dark mode)
        └── services/            # cliente da API (axios)
```

## ⚠️ Antes de começar: cuidado com o nome da pasta

**Nunca use `&`, `%`, `!` ou outros caracteres especiais no caminho da pasta do projeto no Windows.** Eles quebram os scripts `.cmd`/`.ps1` que o `npm` gera para rodar `nodemon`, `vite`, etc., e causam erros confusos como `Cannot find module` ou `Could not determine Node.js install directory`.

✅ Bom: `C:\Dev\Projects\burger-pizza-house`
✅ Bom: `C:\Dev\Projects\Burger and Pizza House`
❌ Evite: `C:\Dev\Projects\Burger & Pizza House`

## Como rodar

### 1. Backend

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

A API sobe em `http://localhost:5000`.

> Rode `npm install` **antes** de qualquer comando `npx prisma ...`. Sem isso, o `npx` baixa a versão mais recente do Prisma (que pode ser incompatível com o schema do projeto) em vez de usar a versão travada no `package-lock.json`.

### 2. Frontend (em outro terminal)

```powershell
cd frontend
npm install
npm run dev
```

O site sobe em `http://localhost:5173`.

### 3. Login

- **E-mail:** `admin@burgerpizzahouse.com`
- **Senha:** `admin123`

## Scripts disponíveis

**Backend** (`backend/package.json`)
| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor com hot-reload (nodemon) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run seed` | Popula o banco com usuário admin, ingredientes e produtos iniciais |

**Frontend** (`frontend/package.json`)
| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o Vite com hot-reload |
| `npm run build` | Gera build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente |

## Funcionalidades

- **Dashboard** — receita hoje/total, pedidos, ticket médio, estoque crítico, gráfico de faturamento (7/30/90/365 dias), produtos mais vendidos, pedidos recentes
- **Produtos** — listar, criar, editar e excluir; busca por nome
- **Pedidos** — criar pedido (produtos, cliente, tipo de entrega, forma de pagamento, desconto, taxa de entrega), acompanhar e atualizar status
- **Estoque** — listar, criar e editar ingredientes; alerta visual de estoque baixo
- **Dark mode** — claro / escuro / automático (segue o sistema)
- **Atalhos de teclado** — `Ctrl+K` foca a busca, `Ctrl+N` vai para Produtos, `Ctrl+P` vai para Pedidos
- Layout responsivo (desktop, tablet e mobile) com sidebar recolhível

## Solução de problemas comuns

| Erro | Causa | Solução |
|---|---|---|
| `Cannot find module '...nodemon.js'` ou `Could not determine Node.js install directory` | Caractere especial (`&`) no caminho da pasta | Renomeie a pasta sem `&`, `%` etc. |
| `The datasource property 'url' is no longer supported` (P1012) | `npx prisma` rodou sem `node_modules` local e baixou uma versão nova do Prisma | Rode `npm install` antes de `npx prisma ...` |
| `'ts-node'/'nodemon'/'vite' não é reconhecido...` | Faltou `npm install` | Rode `npm install` na pasta (`backend` ou `frontend`) antes de `npm run dev` |
| `The table 'main.users' does not exist` | Banco de dados ainda não foi migrado | Rode `npx prisma migrate dev --name init` e depois `npm run seed` |
| `EADDRINUSE: address already in use :::5000` | Já existe um processo usando a porta 5000 (outro terminal com `npm run dev` aberto) | Feche o terminal antigo, ou rode `netstat -ano \| findstr :5000` e `taskkill /PID <pid> /F` |

## Ainda não implementado

Funcionalidades que exigem infraestrutura ou credenciais externas e ficaram fora do escopo atual: multiempresa/permissões, integrações com WhatsApp, iFood, Pix, Mercado Pago e Stone, notificações em tempo real (WebSocket), PWA, impressão térmica, backup automático e exportação para Excel/PDF.
