-- Schema inicial do Burger & Pizza House.
-- Valores monetários e quantidades de estoque usam NUMERIC (sem erro de ponto flutuante).

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'OPERATOR',
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    superuser     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'MANAGER', 'OPERATOR'))
);
CREATE UNIQUE INDEX ux_users_email ON users (email);

CREATE TABLE ingredients (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(150)   NOT NULL,
    unit          VARCHAR(10)    NOT NULL DEFAULT 'g',
    current_stock NUMERIC(14, 4) NOT NULL DEFAULT 0,
    min_stock     NUMERIC(14, 4) NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC(12, 4) NOT NULL,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    -- Rede de segurança: estoque nunca negativo, mesmo que haja um bug de concorrência.
    CONSTRAINT ck_ingredients_stock_non_negative CHECK (current_stock >= 0)
);

CREATE TABLE products (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(150)   NOT NULL,
    description      TEXT,
    price            NUMERIC(12, 2) NOT NULL,
    cost             NUMERIC(12, 2) NOT NULL DEFAULT 0,
    category         VARCHAR(20)    NOT NULL DEFAULT 'PIZZA',
    type             VARCHAR(20)    NOT NULL DEFAULT 'SIMPLE',
    active           BOOLEAN        NOT NULL DEFAULT TRUE,
    image            VARCHAR(500),
    preparation_time INTEGER        NOT NULL DEFAULT 15,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_products_category CHECK (category IN ('PIZZA', 'HAMBURGUER', 'DRINK', 'DESSERT', 'SIDE')),
    CONSTRAINT ck_products_type CHECK (type IN ('SIMPLE', 'PIZZA_HALF', 'PIZZA_QUARTER', 'COMBO'))
);
CREATE INDEX ix_products_name ON products (name);

CREATE TABLE product_ingredients (
    id            BIGSERIAL PRIMARY KEY,
    product_id    BIGINT         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    ingredient_id BIGINT         NOT NULL REFERENCES ingredients (id) ON DELETE CASCADE,
    quantity      NUMERIC(14, 4) NOT NULL,
    unit          VARCHAR(10)    NOT NULL DEFAULT 'g'
);
CREATE INDEX ix_product_ingredients_product_id ON product_ingredients (product_id);
CREATE INDEX ix_product_ingredients_ingredient_id ON product_ingredients (ingredient_id);

CREATE TABLE orders (
    id               BIGSERIAL PRIMARY KEY,
    number           INTEGER        NOT NULL,
    user_id          BIGINT         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    customer_name    VARCHAR(150),
    customer_phone   VARCHAR(30),
    customer_address VARCHAR(255),
    type             VARCHAR(20)    NOT NULL DEFAULT 'DELIVERY',
    status           VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    payment_method   VARCHAR(20)    NOT NULL DEFAULT 'CASH',
    total            NUMERIC(12, 2) NOT NULL,
    discount         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    delivery_fee     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    note             TEXT,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_orders_type CHECK (type IN ('DELIVERY', 'TAKEAWAY', 'TABLE')),
    CONSTRAINT ck_orders_status CHECK (status IN
        ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT ck_orders_payment CHECK (payment_method IN
        ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'IFOOD', 'MEAL_TICKET'))
);
-- Número sequencial nunca repete (rede de segurança do advisory lock usado ao criar o pedido).
CREATE UNIQUE INDEX ux_orders_number ON orders (number);
CREATE INDEX ix_orders_created_at ON orders (created_at);
CREATE INDEX ix_orders_status_created_at ON orders (status, created_at);

CREATE TABLE order_items (
    id           BIGSERIAL PRIMARY KEY,
    order_id     BIGINT         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id   BIGINT         NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    quantity     INTEGER        NOT NULL,
    unit_price   NUMERIC(12, 2) NOT NULL,
    total_price  NUMERIC(12, 2) NOT NULL,
    notes        TEXT,
    half_flavors TEXT
);
CREATE INDEX ix_order_items_order_id ON order_items (order_id);
CREATE INDEX ix_order_items_product_id ON order_items (product_id);

CREATE TABLE audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    action     VARCHAR(100) NOT NULL,
    entity     VARCHAR(100) NOT NULL,
    entity_id  VARCHAR(50),
    details    TEXT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_logs_entity ON audit_logs (entity, entity_id);

-- Livro-razão de estoque (delta < 0 = saída, delta > 0 = entrada).
CREATE TABLE stock_movements (
    id            BIGSERIAL PRIMARY KEY,
    ingredient_id BIGINT         NOT NULL REFERENCES ingredients (id) ON DELETE CASCADE,
    order_id      BIGINT         REFERENCES orders (id) ON DELETE SET NULL,
    user_id       BIGINT         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    delta         NUMERIC(14, 4) NOT NULL,
    reason        VARCHAR(30)    NOT NULL,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_stock_movements_reason CHECK (reason IN ('ORDER', 'ORDER_CANCEL', 'MANUAL_ADD', 'MANUAL_REMOVE'))
);
CREATE INDEX ix_stock_movements_ingredient_id ON stock_movements (ingredient_id);
CREATE INDEX ix_stock_movements_order_id ON stock_movements (order_id);
