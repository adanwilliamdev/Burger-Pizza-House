# 🍕🍔 Burger & Pizza House — ERP

Sistema de gestão para hamburgueria e pizzaria, desenvolvido com **Python + Django**, com gerenciamento de pedidos, produtos, ingredientes, receitas, estoque, usuários e dashboard.

## ✨ Funcionalidades

* 🛒 Gestão de pedidos e carrinho
* 📦 Controle de estoque
* 🍔 Cadastro de produtos
* 🧂 Gerenciamento de ingredientes e receitas
* 👥 Usuários e níveis de acesso
* 📊 Dashboard com indicadores e faturamento
* 💰 Cálculo de valores e descontos
* 🔄 Controle de status dos pedidos
* 🛡️ Validação e regras de negócio
* 🗑️ Soft delete de produtos e ingredientes

## 🛠️ Stack

<p align="center">
  <img src="https://skillicons.dev/icons?i=python,django,sqlite,html,css,tailwind,git,github" />
</p>

## 🚀 Executando o projeto

```bash
git clone <URL_DO_REPOSITORIO>
cd burger-pizza-house

python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py runserver
```

Acesse:

```text
http://127.0.0.1:8000/
```

## 🔐 Acesso inicial

**E-mail:** `admin@burgerpizzahouse.com`
**Senha:** `admin123`

> Altere a senha padrão antes de utilizar o sistema em produção.

## 📌 Destaques técnicos

* Django ORM
* Django Forms
* Autenticação e permissões
* Transações atômicas
* Controle de estoque integrado aos pedidos
* Máquina de estados para pedidos
* Tratamento de valores monetários
* Templates server-side
* Interface responsiva com Tailwind CSS

## 🎯 Objetivo

Projeto desenvolvido para demonstrar a construção de um **ERP completo com Python e Django**, aplicando conceitos de backend, banco de dados, autenticação, regras de negócio, estoque e desenvolvimento web.
