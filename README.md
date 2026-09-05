# 🍕 Burger & Pizza House ERP

Sistema ERP completo para pizzarias e hamburguerias desenvolvido com **React + Node.js + TypeScript**, oferecendo controle de pedidos, produtos, estoque, autenticação segura e dashboard com indicadores em tempo real.

---

## 📷 Preview


<div align="center">

| Dashboard | Produtos |
|-----------|-----------|
| <img src="./frontend/public/dashboard.png" width="450"/> | <img src="./frontend/public/produtos.png" width="450"/> |

| Pedidos | Estoque |
|-----------|-----------|
| <img src="./frontend/public/pedidos.png" width="450"/> | <img src="./frontend/public/estoque.png" width="450"/> |

</div>

---

# ✨ Funcionalidades

## 📊 Dashboard

- Receita diária
- Receita total
- Ticket médio
- Total de pedidos
- Produtos mais vendidos
- Gráfico de faturamento
- Pedidos recentes
- Estoque crítico

---

## 📦 Produtos

- Cadastro
- Edição
- Exclusão
- Busca
- Categorias
- Controle de preços

---

## 🛒 Pedidos

- Cadastro de clientes
- Produtos do pedido
- Desconto
- Taxa de entrega
- Formas de pagamento
- Alteração de status
- Histórico de pedidos

---

## 🥬 Estoque

- Cadastro de ingredientes
- Controle de quantidade
- Estoque mínimo
- Alertas visuais
- Atualização automática ao registrar pedidos

---

## 🔐 Autenticação

- Login JWT
- Senhas criptografadas com Bcrypt
- Rotas protegidas
- Controle de sessão

---

## 🎨 Interface

- Layout responsivo
- Sidebar recolhível
- Tema Claro
- Tema Escuro
- Tema Automático
- Feedback visual
- Design moderno

---

# 🛠️ Tecnologias

## Backend

| Tecnologia | Uso |
|------------|----------------|
| Node.js | Runtime |
| Express | API REST |
| TypeScript | Linguagem |
| Prisma ORM | ORM |
| SQLite | Banco de Dados |
| JWT | Autenticação |
| Bcrypt | Hash de senhas |

---

## Frontend

| Tecnologia | Uso |
|------------|----------------|
| React | Interface |
| Vite | Build |
| TypeScript | Linguagem |
| TailwindCSS | Estilização |
| Axios | API |
| React Router | Rotas |
| Recharts | Dashboard |

---

# 📂 Estrutura

```text
Burger-Pizza-House
│
├── backend
│   ├── prisma
│   ├── src
│   │   ├── controllers
│   │   ├── middlewares
│   │   ├── routes
│   │   ├── utils
│   │   └── server.ts
│   └── package.json
│
└── frontend
    ├── src
    │   ├── components
    │   ├── contexts
    │   ├── hooks
    │   ├── layouts
    │   ├── pages
    │   ├── services
    │   └── main.tsx
    └── package.json
```

---

# 🚀 Instalação

## Clone

```bash
git clone https://github.com/adanwilliamdev/Burger-Pizza-House.git
```

---

## Backend

```bash
cd backend

npm install

cp .env.example .env

npx prisma generate

npx prisma migrate dev

npm run seed

npm run dev
```

Servidor:

```
http://localhost:5000
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Aplicação:

```
http://localhost:5173
```

---

# ⚙️ Variáveis de Ambiente

Backend (`.env`)

```env
DATABASE_URL="file:./dev.db"

JWT_SECRET=your_secret_key

PORT=5000

# Origens permitidas para CORS, separadas por vírgula
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

---

# 🔑 Credenciais

| Campo | Valor |
|-------|-------|
| Email | admin@burgerpizzahouse.com |
| Senha | admin123 |

> Essas são as credenciais de um ambiente de demonstração/desenvolvimento (criadas pelo `npm run seed`). Não reutilize essa senha em um deploy público.

---

# 🔒 Segurança

Medidas aplicadas na API para além do login com JWT:

- **Criação de usuários restrita a administradores.** `POST /auth/register` exige um token de um usuário `ADMIN` autenticado — não é mais possível se auto-cadastrar como admin pela API pública. O primeiro admin é criado pelo `npm run seed`.
- **Token JWT em cookie `httpOnly`**, não em `localStorage` — reduz a superfície de roubo de sessão via XSS, já que scripts no navegador não conseguem ler o cookie. `POST /auth/logout` limpa o cookie no servidor.
- **`JWT_SECRET` obrigatório e com checagem de força mínima** — o servidor recusa subir se a variável não existir ou for muito curta/óbvia.
- **Validação de entrada com Zod** em todas as rotas de escrita (auth, produtos, ingredientes e pedidos), rejeitando payloads com tipos ou formatos inválidos antes de chegar ao banco.
- **Rate limiting**: `/auth/login` aceita no máximo 10 tentativas a cada 15 minutos por IP; as demais rotas da API têm um limite geral de 300 requisições/15min como proteção contra abuso.
- **Helmet** aplicando cabeçalhos HTTP de segurança padrão.
- **CORS configurável** via `CORS_ORIGIN` no `.env`, em vez de origem fixa no código, com `credentials: true` para permitir o cookie de sessão entre origens diferentes em produção.
- **Criação de pedido em transação atômica** (`prisma.$transaction`): a numeração sequencial do pedido, a checagem de estoque e a baixa dos ingredientes acontecem dentro da mesma transação — elimina a condição de corrida em que dois pedidos simultâneos poderiam receber o mesmo número, e garante que nunca fica um pedido "pela metade" se algo falhar no meio do processo.
- **Checagem de estoque antes de confirmar o pedido**: se algum ingrediente não tiver saldo suficiente, o pedido inteiro é rejeitado (`409`) com a lista de itens em falta, em vez de deixar o estoque ficar negativo.
- **Transições de status validadas**: `PATCH /orders/:id/status` só aceita mudanças de status que fazem sentido no fluxo operacional (por exemplo, não é possível pular direto de `PENDING` para `DELIVERED`, nem reabrir um pedido `DELIVERED`/`CANCELLED`).
- **Exclusão segura de produtos e ingredientes**: produtos com pedidos associados são desativados (soft delete) em vez de apagados, preservando o histórico; ingredientes referenciados por algum produto não podem ser excluídos.
- **Mensagens de erro reduzidas em produção**: com `NODE_ENV=production`, erros inesperados (5xx) retornam uma mensagem genérica ao cliente — os detalhes completos continuam indo pro log do servidor, evitando vazar informações internas (stack trace, mensagens do Prisma, caminhos de arquivo).
- **Regra de negócio no backend**: o `discount` de um pedido nunca pode ser maior que o subtotal dos itens (evita total negativo), e tanto `discount` quanto `deliveryFee` são validados como não-negativos.
- **Rotas do frontend protegidas**: páginas internas (dashboard, produtos, pedidos, estoque) redirecionam para `/login` quando não há usuário autenticado, em vez de depender só do 401 da API.
- **Banco de dados local fora do controle de versão**: `*.db`/`*.sqlite` estão no `.gitignore` — o schema é recriado com `npx prisma migrate dev` e populado com `npm run seed`, sem depender de um arquivo de banco commitado (que poderia conter hashes de senha ou dados de teste).

## Vulnerabilidades conhecidas de dependências (`npm audit`)

Alguns avisos do `npm audit` não foram corrigidos porque a correção exige um upgrade de versão maior (*breaking change*) que não foi testado neste projeto:

- **Backend**: `qs`/`body-parser` (moderada), dependência transitiva do **Express 4.x**. Só é resolvida migrando para o Express 5, que muda parte da API de rotas/middlewares.
- **Frontend**: `vite` (alta) e `react-router-dom` (moderada) — as correções publicadas exigem Vite 6+/8 e React Router 7, ambos com mudanças de API. As vulnerabilidades do Vite afetam principalmente o **servidor de desenvolvimento** (`npm run dev`), não o artefato de build de produção.

Antes de fazer qualquer uma dessas migrações, rode `npm audit` para ver o estado atual e planeje testar todas as rotas/páginas manualmente após o upgrade.

---

# 📈 Indicadores do Dashboard

- Receita diária
- Receita total
- Ticket médio
- Pedidos do dia
- Produtos mais vendidos
- Estoque crítico
- Evolução do faturamento
- Pedidos recentes

---

# ⌨️ Atalhos

| Atalho | Ação |
|---------|------|
| Ctrl + 1 | Dashboard |
| Ctrl + 2 | Produtos |
| Ctrl + 3 | Pedidos |
| Ctrl + 4 | Estoque |
| Ctrl + L | Logout |

---

# 📜 Scripts

## Backend

```bash
npm run dev
npm run build
npm start
npm run seed
```

Prisma

```bash
npx prisma studio
```

---

## Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

# 🚧 Roadmap

### Próximas funcionalidades

- [ ] Relatórios em PDF
- [ ] Exportação Excel
- [ ] Impressora térmica
- [ ] Multiempresa
- [ ] RBAC
- [ ] Integração iFood
- [ ] WhatsApp
- [ ] Gateway PIX
- [ ] Gateway Cartão
- [ ] PWA
- [ ] React Native
- [ ] Backup automático
- [ ] Inteligência de vendas
- [ ] Programa de fidelidade

---

# 🧪 Testes

```bash
cd backend
npm test
```

30 testes automatizados (Jest + ts-jest) cobrindo:

- **Schemas de validação** (`src/schemas/__tests__`): payloads válidos/inválidos de login, registro e criação de pedido, incluindo a rejeição de `role` fora do enum permitido.
- **`OrderController`** (`src/controllers/__tests__`): criação de pedido com estoque suficiente/insuficiente, produto inativo, desconto maior que o subtotal, e as transições de status válidas/inválidas — com o Prisma inteiramente mockado (não precisa de banco real para rodar).
- **`errorHandler`** (`src/middlewares/__tests__`): confirma que erros 5xx genéricos são ocultados em produção, que erros de negócio (4xx) continuam com a mensagem original, e que detalhes do Prisma não vazam.

O workflow `.github/workflows/ci.yml` roda os testes, o `prisma generate` e o build (`tsc`) do backend, além do build do frontend, a cada push/PR para `main`.

---

# 📌 API

## Principais Endpoints

### Autenticação

```
POST /auth/login
POST /auth/register   (requer token de ADMIN — ver seção Segurança)
```

### Produtos

```
GET /products
POST /products
PUT /products/:id
DELETE /products/:id
```

### Pedidos

```
GET /orders
POST /orders
PATCH /orders/:id
```

### Estoque

```
GET /stock
POST /stock
PUT /stock/:id
```

---

# 🤝 Contribuindo

1. Faça um Fork

2. Crie uma branch

```bash
git checkout -b feature/minha-feature
```

3. Commit

```bash
git commit -m "Minha feature"
```

4. Push

```bash
git push origin feature/minha-feature
```

5. Abra um Pull Request

---

# 📄 Licença

Distribuído sob a licença MIT.

---

# 👨‍💻 Autor

**Adan William Oliveira Santos**

GitHub

https://github.com/adanwilliamdev

LinkedIn

https://www.linkedin.com/in/awosantos

Portfólio

https://adanwilliamdev.github.io/

---

<div align="center">

### 🍕 Burger & Pizza House ERP

Sistema moderno para gestão de pizzarias e hamburguerias.

Desenvolvido com ❤️ utilizando React, Node.js e TypeScript.

</div>
