# 🍕 Burger & Pizza House — ERP

Sistema de gestão para pizzarias e hamburguerias, desenvolvido para gerenciamento de produtos, estoque, pedidos, usuários e indicadores operacionais.

## 🛠️ Stack

### Frontend

<p>
  <img src="https://img.shields.io/badge/Next.js%2016-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white" alt="shadcn/ui">
  <img src="https://img.shields.io/badge/TanStack%20Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white" alt="TanStack Query">
</p>

### Backend

<p>
  <img src="https://img.shields.io/badge/Python%203.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white" alt="Pydantic">
  <img src="https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white" alt="SQLAlchemy">
  <img src="https://img.shields.io/badge/Alembic-333333?style=for-the-badge" alt="Alembic">
</p>

### Banco de Dados & Infraestrutura

<p>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/Docker%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose">
</p>

## ✨ Funcionalidades

### 📦 Catálogo

* Cadastro e gerenciamento de produtos
* Pizzas
* Hambúrgueres
* Bebidas
* Sobremesas
* Acompanhamentos
* Definição de receitas e ingredientes por produto

### 📊 Estoque

* Controle de estoque por ingrediente
* Definição de estoque mínimo
* Baixa automática de ingredientes ao realizar pedidos
* Validação da disponibilidade dos ingredientes
* Bloqueio de pedidos quando não existe estoque suficiente

### 🛒 Pedidos

* Criação e gerenciamento de pedidos
* Numeração sequencial
* Cálculo automático de subtotal, desconto, taxa de entrega e total
* Controle completo do ciclo de vida dos pedidos

```text
PENDING → CONFIRMED → PREPARING → READY → DELIVERING → DELIVERED
```

Pedidos também podem ser cancelados a partir de estados não terminais.

### 👥 Usuários e Permissões

| Perfil     | Permissões                                    |
| ---------- | --------------------------------------------- |
| `ADMIN`    | Gerenciamento completo do sistema             |
| `MANAGER`  | Operação e acompanhamento do negócio          |
| `OPERATOR` | Operação de pedidos e consulta de indicadores |

### 📈 Dashboard

* Faturamento por período
* Pedidos pendentes
* Ingredientes com estoque baixo
* Produtos mais vendidos
* Pedidos recentes
* Cache de indicadores utilizando Redis

## 📁 Estrutura

```text
burger-pizza-house/
│
├── backend/
│   ├── app/
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── .env.example
│
├── docker-compose.yml
└── README.md
```

## ⚙️ Como executar

### 🐳 Docker Compose

```bash
cp backend/.env.example backend/.env

docker compose up --build
```

O ambiente inicia PostgreSQL, Redis, backend, frontend, migrações e dados iniciais.

Acesse:

```text
http://localhost:3000
```

### 🔐 Credenciais iniciais

```text
E-mail: admin@burgerpizzahouse.com
Senha: admin123
```

## 🛠️ Execução manual

### Backend

```bash
cd backend

python3.12 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env

alembic upgrade head

python -m app.db.seed

uvicorn app.main:app --reload
```

API:

```text
http://localhost:8000/docs
```

### Frontend

```bash
cd frontend

npm install

cp .env.example .env

npm run dev
```

Frontend:

```text
http://localhost:3000
```

## 🔐 Autenticação

A aplicação utiliza autenticação baseada em **JWT**, incluindo:

* Access Token
* Refresh Token
* Controle de sessão
* Blacklist de Refresh Tokens utilizando Redis

## 🧠 Regras de Negócio

### Validação de estoque

Antes da confirmação de um pedido, o sistema calcula a quantidade total necessária de cada ingrediente considerando todos os itens do carrinho.

Isso evita inconsistências quando diferentes produtos utilizam o mesmo ingrediente.

### Produtos associados a pedidos

Produtos utilizados em pedidos existentes podem ser desativados sem comprometer o histórico das operações.

### Cache

Os principais agregados do dashboard utilizam **Redis** com cache de 30 segundos.

## 🌐 API

A API REST é disponibilizada pelo **FastAPI**.

Documentação interativa:

```text
http://localhost:8000/docs
```

## 🔧 Variáveis de Ambiente

Configure:

```text
backend/.env
frontend/.env
```

Os arquivos de exemplo estão disponíveis em:

```text
backend/.env.example
frontend/.env.example
```

## 📌 Status

Projeto em desenvolvimento, com foco em gerenciamento operacional para estabelecimentos do segmento de alimentação.
