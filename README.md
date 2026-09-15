# 🍕 Burger & Pizza House ERP

<div align="center">

### Sistema de gestão para pizzarias e hamburguerias

Aplicação web full stack para gerenciamento de **pedidos, produtos, estoque e indicadores operacionais**, com autenticação segura, regras de negócio e interface responsiva.

[![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular\&logoColor=white)](https://angular.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js\&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss\&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma\&logoColor=white)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](#-licença)

</div>

---

## 📌 Sobre o projeto

O **Burger & Pizza House ERP** é uma aplicação full stack desenvolvida para centralizar a operação de pizzarias e hamburguerias.

O sistema foi projetado para gerenciar:

* 📊 Indicadores e desempenho operacional
* 📦 Produtos e categorias
* 🛒 Pedidos e fluxo de atendimento
* 🥬 Ingredientes e controle de estoque
* 🔐 Autenticação e controle de acesso
* 🎨 Interface responsiva com tema claro e escuro

A solução utiliza uma **API REST em Node.js + Express** e um **frontend em Angular 20**, com foco em organização, segurança, validação de dados e consistência das regras de negócio.

---

## 📸 Preview

<div align="center">

|                                        Dashboard                                       |                                        Produtos                                       |
| :------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------: |
| <img src="./frontend-angular/public/dashboard.png" width="450" alt="Dashboard do ERP"> | <img src="./frontend-angular/public/produtos.png" width="450" alt="Tela de produtos"> |

|                                       Pedidos                                       |                                       Estoque                                       |
| :---------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------: |
| <img src="./frontend-angular/public/pedidos.png" width="450" alt="Tela de pedidos"> | <img src="./frontend-angular/public/estoque.png" width="450" alt="Tela de estoque"> |

</div>

---

## ✨ Funcionalidades

### 📊 Dashboard

* Receita do dia e receita total
* Ticket médio
* Total de pedidos
* Produtos mais vendidos
* Gráfico de faturamento por período
* Pedidos recentes
* Alertas de estoque crítico

### 📦 Produtos

* Cadastro e edição
* Exclusão com **soft delete**
* Busca por nome
* Organização por categorias
* Controle de preço e custo

### 🛒 Pedidos

* Carrinho de itens
* Dados do cliente
* Descontos e taxa de entrega
* Formas de pagamento
* Alteração de status com transições validadas
* Histórico completo do pedido

### 🥬 Estoque

* Cadastro de ingredientes
* Controle de quantidade
* Estoque mínimo configurável
* Alertas visuais
* Baixa automática de ingredientes ao confirmar pedidos

### 🔐 Autenticação

* Login com JWT
* Token armazenado em cookie `httpOnly`
* Rotas protegidas
* Controle de sessão
* Controle de acesso baseado em função

### 🎨 Interface

* Layout responsivo
* Sidebar recolhível
* Tema claro, escuro e automático
* Feedback visual com toasts
* Atalhos de teclado
* Componentes reutilizáveis

---

## 🛠️ Stack tecnológica

### Backend

| Tecnologia            | Finalidade                     |
| --------------------- | ------------------------------ |
| **Node.js + Express** | API REST                       |
| **TypeScript**        | Linguagem                      |
| **Prisma ORM**        | Persistência e acesso ao banco |
| **SQLite**            | Banco de dados                 |
| **JWT + Bcrypt**      | Autenticação e hash de senhas  |
| **Zod**               | Validação de dados             |
| **Jest + ts-jest**    | Testes automatizados           |

### Frontend

| Tecnologia                | Finalidade                        |
| ------------------------- | --------------------------------- |
| **Angular 20**            | Framework frontend                |
| **Standalone Components** | Arquitetura de componentes        |
| **Signals**               | Gerenciamento de estado reativo   |
| **Tailwind CSS v4**       | Estilização                       |
| **Lucide Angular**        | Ícones                            |
| **RxJS + HttpClient**     | Comunicação com a API             |
| **date-fns**              | Manipulação e formatação de datas |

---

## 📂 Estrutura do projeto

```text
Burger-Pizza-House-Angular
│
├── backend
│   ├── prisma
│   │   ├── schema.prisma
│   │   ├── migrations
│   │   └── seed
│   │
│   ├── src
│   │   ├── controllers
│   │   ├── middlewares
│   │   ├── routes
│   │   ├── schemas
│   │   └── server.ts
│   │
│   └── package.json
│
└── frontend-angular
    ├── src
    │   ├── app
    │   │   ├── core
    │   │   ├── shared
    │   │   ├── layout
    │   │   ├── pages
    │   │   ├── app.config.ts
    │   │   └── app.routes.ts
    │   │
    │   ├── environments
    │   └── styles.css
    │
    ├── proxy.conf.json
    └── package.json
```

---

## 🏗️ Arquitetura

```text
┌──────────────────────────────┐
│          Angular 20          │
│   UI · Guards · Services     │
│   RxJS · HttpClient          │
└──────────────┬───────────────┘
               │ HTTP / REST
               ▼
┌──────────────────────────────┐
│      Node.js + Express       │
│ Controllers · Routes         │
│ Middlewares · Validation     │
└──────────────┬───────────────┘
               │ Prisma ORM
               ▼
┌──────────────────────────────┐
│            SQLite            │
│       Dados da aplicação     │
└──────────────────────────────┘
```

### Responsabilidades

**Frontend**

* Interface e navegação
* Guards e controle de acesso
* Serviços e componentes
* Comunicação com a API

**Backend**

* Autenticação e autorização
* Validação de dados
* Regras de negócio
* Operações transacionais
* Controle de estoque

**Banco de dados**

* Usuários
* Produtos
* Categorias
* Pedidos
* Ingredientes
* Relacionamentos da aplicação

---

## 🚀 Instalação e execução

### Pré-requisitos

* Node.js **20+**
* npm
* Node.js **22** recomendado

### Backend

```bash
cd backend
npm install

cp .env.example .env

npx prisma generate
npx prisma migrate dev
npm run seed

npm run dev
```

A API estará disponível em:

```text
http://localhost:5000
```

As rotas utilizam o prefixo `/api`:

```text
http://localhost:5000/api/products
```

### Frontend

Em outro terminal:

```bash
cd frontend-angular
npm install
npm start
```

A aplicação estará disponível em:

```text
http://localhost:4200
```

O `npm start` utiliza automaticamente o `proxy.conf.json` para encaminhar as requisições `/api` para o backend.

### Build de produção

```bash
npm run build
```

Os arquivos serão gerados em:

```text
dist/frontend-angular/browser
```

Para produção, configure a URL da API em:

```text
src/environments/environment.prod.ts
```

---

## ⚙️ Variáveis de ambiente

### Backend

Arquivo `backend/.env`:

```env
DATABASE_URL="file:./dev.db"

JWT_SECRET=your_secret_key

PORT=5000

CORS_ORIGIN=http://localhost:4200
```

`CORS_ORIGIN` aceita múltiplas origens separadas por vírgula.

### Frontend

```ts
export const environment = {
  production: false,
  apiUrl: '/api'
};
```

Em desenvolvimento, o proxy do Angular encaminha as requisições para:

```text
http://localhost:5000
```

---

## 🔑 Credenciais de demonstração

| Campo | Valor                        |
| ----- | ---------------------------- |
| Email | `admin@burgerpizzahouse.com` |
| Senha | `admin123`                   |

> As credenciais são criadas pelo `npm run seed` e destinam-se exclusivamente a ambientes de demonstração/desenvolvimento.

---

## ⌨️ Atalhos de teclado

| Atalho           | Ação                    |
| ---------------- | ----------------------- |
| `Ctrl / Cmd + K` | Focar no campo de busca |
| `Ctrl / Cmd + N` | Abrir Produtos          |
| `Ctrl / Cmd + P` | Abrir Pedidos           |

---

## 🎨 Design system

O projeto utiliza **Tailwind CSS v4** com tokens personalizados definidos em:

```text
frontend-angular/src/styles.css
```

Principais características:

* Cor primária: `#F97316`
* Estados de sucesso, erro, aviso e informação
* Tema claro e escuro
* Persistência do tema via `localStorage`
* Componentes visuais reutilizáveis
* Cards, tabelas, badges, modais, inputs e botões padronizados

---

## 🔒 Segurança

A API possui diversas camadas de proteção:

* 🔐 JWT armazenado em cookie `httpOnly`
* 🔑 `JWT_SECRET` obrigatório e validado
* 🛡️ Helmet para headers de segurança
* 🚦 Rate limiting para autenticação e demais rotas
* ✅ Validação de entrada com Zod
* 👤 Controle de acesso baseado em função
* 🌐 CORS configurável
* 💾 Transações atômicas com Prisma
* 📦 Validação de estoque antes da confirmação de pedidos
* 🔄 Transições de status validadas
* 🗑️ Soft delete para registros relacionados
* 🚫 Proteção contra exposição de detalhes internos de erros
* 🛣️ Guards de autenticação no frontend
* 🧹 Banco de dados local excluído do controle de versão

### Regras de negócio

O backend também garante:

* Desconto não pode ultrapassar o subtotal
* Desconto e taxa de entrega não podem ser negativos
* Pedidos não podem ser criados sem estoque suficiente
* Baixa de estoque ocorre dentro da mesma transação do pedido
* Produtos vinculados a pedidos não são removidos fisicamente
* Ingredientes utilizados por produtos não podem ser excluídos

---

## 🧪 Testes

### Backend

```bash
cd backend
npm test
```

O backend possui **30 testes automatizados** utilizando Jest + ts-jest.

Os testes cobrem:

* Validação de schemas
* Login e registro
* Criação de pedidos
* Controle de estoque
* Produtos inativos
* Validação de descontos
* Transições de status
* Tratamento de erros
* Proteção contra exposição de informações internas

### Frontend

```bash
cd frontend-angular
npm test
```

Os testes utilizam **Karma + Jasmine** e requerem Chrome ou Chromium instalado.

---

## 📡 API REST

Todas as rotas utilizam o prefixo `/api`.

### Authentication

```http
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/register
```

> `POST /api/auth/register` requer autenticação de administrador.

### Products

```http
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

### Orders

```http
GET   /api/orders
POST  /api/orders
PATCH /api/orders/:id/status
```

### Ingredients

```http
GET  /api/ingredients
POST /api/ingredients
PUT  /api/ingredients/:id
```

### Dashboard

```http
GET /api/dashboard/stats
GET /api/dashboard/revenue?days=7
```

---

## 📜 Scripts

### Backend

```bash
npm run dev        # Desenvolvimento com hot-reload
npm run build      # Compila o backend
npm start          # Executa o build
npm run seed       # Popula dados de demonstração
npm test           # Executa os testes
npx prisma studio  # Abre o Prisma Studio
```

### Frontend

```bash
npm start          # Angular + proxy
npm run build      # Build de produção
npm run watch      # Build com watch
npm test           # Executa os testes
```

---

## 🗺️ Roadmap

* [ ] Relatórios em PDF
* [ ] Exportação para Excel
* [ ] Integração com impressoras térmicas
* [ ] Multiempresa e RBAC
* [ ] Integração com iFood e WhatsApp
* [ ] Gateway Pix e cartão
* [ ] Progressive Web App (PWA)
* [ ] Backup automático
* [ ] Programa de fidelidade

---

## 📄 Licença

Este projeto está distribuído sob a licença **MIT**.

---

<div align="center">

### 🍕 Burger & Pizza House ERP

**Modern restaurant management system built with Angular, Node.js and Prisma.**

</div>
