# 🔥 Burger & Pizza House

ERP para hamburgueria e pizzaria: **pedidos**, **catálogo de produtos com receita**, **estoque de ingredientes** e **dashboard** de vendas. Aplicação 100% Java: uma única aplicação Spring Boot que serve a interface web, a API REST e fala com PostgreSQL e Redis.

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem / build | Java 21, Maven |
| Aplicação | Spring Boot 3.3 (Spring MVC) |
| Interface web | Thymeleaf (renderização no servidor, sem JavaScript obrigatório) + CSS próprio |
| Segurança | Spring Security — sessão + CSRF na interface; JWT (access/refresh) na API |
| Persistência | Spring Data JPA / Hibernate, PostgreSQL 16, migrações com Flyway |
| Cache e controle | Redis 7 (cache do dashboard, blacklist de tokens, anti força bruta) |
| Documentação da API | springdoc-openapi (Swagger UI) |
| Testes | JUnit 5 (unitários + integração com concorrência real) |
| Infra | Docker, Docker Compose, GitHub Actions |

## Funcionalidades

- **Pedidos**: carrinho com observações por item, desconto, taxa de entrega, tipo (entrega/retirada/mesa) e forma de pagamento; numeração sequencial; fluxo de status (`Pendente → Confirmado → Preparando → Pronto → Saiu para entrega → Entregue`, com cancelamento a partir de qualquer estado não final).
- **Catálogo**: produtos por categoria com **receita** (ingredientes e quantidades). Produto que já tem pedidos é desativado em vez de apagado, preservando o histórico.
- **Estoque**: ingredientes com estoque mínimo, alerta de estoque baixo, ajuste manual (entrada/saída) e livro-razão de movimentações.
- **Dashboard**: faturamento e pedidos do dia, pedidos em andamento, estoque baixo, mais vendidos e faturamento por dia (7/14/30/90 dias), no fuso do negócio.
- **Perfis**: `ADMIN` gerencia produtos, ingredientes e usuários; `MANAGER` e `OPERATOR` operam pedidos e consultam o painel.

## Garantias de robustez

- **Nunca vende estoque que não existe**, nem com pedidos simultâneos: as linhas de ingredientes são travadas (`SELECT … FOR UPDATE`, sempre em ordem de id, sem deadlock) *antes* de validar o saldo. Há ainda um `CHECK (current_stock >= 0)` no banco como rede de segurança.
- **Pedido atômico**: pedido, itens, baixa de estoque, movimentos e auditoria numa única transação. Falta de estoque devolve a lista exata de ingredientes em falta.
- **Cancelamento devolve o estoque exatamente uma vez**, com base no livro-razão (`stock_movements`), mesmo que a receita mude depois.
- **Número do pedido sem repetição** (advisory lock da transação + índice único).
- **Dinheiro e quantidades em `NUMERIC`/`BigDecimal`** — sem erro de ponto flutuante.
- **Redis é auxiliar**: se cair, o sistema continua vendendo (só a blacklist de tokens falha "fechada": recusa a operação em vez de aceitar token possivelmente revogado).
- **Segurança**: JWT com `jti` único e rotação de refresh token; bloqueio temporário de login após N falhas; a aplicação se recusa a subir em `APP_ENV=production` com a chave JWT padrão/curta.

## Como rodar

### Docker (recomendado)

```bash
docker compose up --build
```

- Aplicação: http://localhost:8080
- API (Swagger): http://localhost:8080/docs
- Saúde: http://localhost:8080/api/health e `/api/health/ready`

Login inicial: `admin@burgerpizzahouse.com` / `admin123` (**troque a senha em produção** com `SEED_ADMIN_PASSWORD` antes do primeiro start).

Opcional: `cp .env.example .env` para ajustar variáveis (o Compose lê o arquivo automaticamente).

### Local (sem Docker para a aplicação)

Requisitos: JDK 21, Maven 3.9+, PostgreSQL e Redis em execução.

```bash
docker compose up -d postgres redis   # só as dependências
mvn spring-boot:run
```

As migrações (Flyway) e os dados iniciais rodam automaticamente na inicialização. O seed é idempotente e nunca sobrescreve dados existentes; desligue com `APP_SEED_ENABLED=false`.

## Testes

```bash
mvn test      # unitários (cálculo de estoque, dinheiro, fluxo de status)
mvn verify    # + integração com concorrência real (exige PostgreSQL e Redis no ar)
```

Os testes de integração cobrem: pedidos simultâneos que nunca vendem além do estoque, números de pedido únicos sob concorrência e cancelamento simultâneo devolvendo o estoque uma única vez.

## API REST

Prefixo `/api`, autenticada por `Authorization: Bearer <access_token>`. Documentação interativa em `/docs`.

| Recurso | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `/refresh`, `/logout`; `GET /api/auth/me` |
| Pedidos | `GET/POST /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/status` |
| Produtos | `GET /api/products`, `GET /api/products/{id}`; admin: `POST`, `PUT`, `DELETE` |
| Ingredientes | `GET /api/ingredients` (`?low_stock=true`); admin: `POST`, `PUT`, `DELETE`, `POST /{id}/stock` |
| Usuários | admin: `GET/POST /api/users` |
| Dashboard | `GET /api/dashboard?days=7` |

Erros no formato `{"detail": "mensagem"}`; falta de estoque responde `409` com `{"detail": {"message": "...", "shortages": [...]}}`.

## Configuração (variáveis de ambiente)

Veja `.env.example`. Principais: `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `REDIS_URL`, `JWT_SECRET_KEY`, `APP_ENV`, `BUSINESS_TIMEZONE`, `CORS_ORIGINS`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_SECONDS`, `APP_SEED_ENABLED`, `SEED_ADMIN_PASSWORD`.

## Estrutura

```
src/main/java/com/burgerpizzahouse/
├── config/       propriedades, segurança, seed, OpenAPI
├── domain/       entidades JPA e enums
├── repository/   Spring Data (inclui as consultas com lock)
├── service/      regras de negócio (pedidos, estoque, dashboard, auth)
├── security/     JWT, filtros e handlers de login
├── api/          controllers REST (/api/**)
├── dto/          contratos da API
└── web/          controllers e formulários da interface (Thymeleaf)
src/main/resources/
├── db/migration/ migrações Flyway
├── templates/    páginas Thymeleaf
└── static/       CSS e favicon
```

## Observação sobre o cardápio e receitas

No formulário de produto são exibidas linhas em branco para a receita; para mais ingredientes do que as linhas exibidas, salve e edite o produto novamente (cada edição abre novas linhas).
