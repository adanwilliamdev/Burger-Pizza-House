# 🍕 Burger & Pizza House — ERP

Sistema ERP desenvolvido para pizzarias e hamburguerias, permitindo o gerenciamento de produtos, pedidos e estoque por meio de uma interface moderna e intuitiva. O sistema também oferece um dashboard com indicadores em tempo real para auxiliar na tomada de decisões.

---

## 📌 Funcionalidades

- Dashboard com métricas de vendas e faturamento
- Gestão completa de produtos
- Cadastro e controle de ingredientes
- Controle de estoque com alerta de itens críticos
- Criação e acompanhamento de pedidos
- Atualização do status dos pedidos
- Autenticação via JWT
- Interface responsiva para desktop, tablet e mobile
- Tema Claro, Escuro e Automático
- Atalhos de teclado para maior produtividade

---

# 🛠 Tecnologias

## Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- SQLite
- JSON Web Token (JWT)

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts
- Axios

---

# 📂 Estrutura do Projeto

```
.
├── backend
│   ├── prisma
│   │   └── schema.prisma
│   └── src
│       ├── controllers
│       ├── middlewares
│       ├── routes
│       └── seed.ts
│
└── frontend
    └── src
        ├── components
        ├── hooks
        ├── layouts
        ├── pages
        └── services
```

---

# 🚀 Executando o projeto

## Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

Servidor disponível em:

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

Aplicação disponível em:

```
http://localhost:5173
```

---

# 🔐 Credenciais de demonstração

| Campo | Valor |
|--------|-------|
| E-mail | `admin@burgerpizzahouse.com` |
| Senha | `admin123` |

---

# 📊 Dashboard

O dashboard apresenta indicadores estratégicos para acompanhamento do negócio:

- Receita do dia
- Receita total
- Quantidade de pedidos
- Ticket médio
- Estoque crítico
- Produtos mais vendidos
- Pedidos recentes
- Gráfico de faturamento (7, 30, 90 e 365 dias)

---

# 📦 Gestão de Produtos

- Cadastro de produtos
- Edição
- Exclusão
- Busca por nome

---

# 🛒 Gestão de Pedidos

- Criação de pedidos
- Seleção de produtos
- Cliente
- Tipo de entrega
- Forma de pagamento
- Taxa de entrega
- Desconto
- Atualização de status

---

# 🥬 Gestão de Estoque

- Cadastro de ingredientes
- Controle de quantidade
- Atualização de estoque
- Indicadores visuais de estoque baixo

---

# 📱 Interface

- Layout responsivo
- Sidebar recolhível
- Design System próprio
- Componentes reutilizáveis
- Dark Mode
- Navegação otimizada por atalhos

---

# 📜 Scripts

## Backend

| Comando | Descrição |
|----------|-----------|
| `npm run dev` | Inicia o servidor em desenvolvimento |
| `npm run build` | Compila a aplicação |
| `npm run seed` | Popula o banco de dados |

## Frontend

| Comando | Descrição |
|----------|-----------|
| `npm run dev` | Inicia o Vite |
| `npm run build` | Gera a versão de produção |
| `npm run preview` | Visualiza a build de produção |

---

# 🚧 Melhorias Futuras

- Multiempresa
- Controle de usuários e permissões
- Integração com iFood
- Integração com WhatsApp
- Integração com Pix e gateways de pagamento
- Notificações em tempo real (WebSocket)
- Impressão térmica
- Exportação para Excel e PDF
- Backup automático
- Progressive Web App (PWA)

---

## 📄 Licença

Projeto desenvolvido para fins de estudo, demonstração de habilidades e composição de portfólio.
