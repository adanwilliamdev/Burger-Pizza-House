-- V3: controle de pagamento (pago / a receber, troco) e motivo de cancelamento com destino do estoque.

ALTER TABLE orders ADD COLUMN paid            BOOLEAN        NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN paid_at         TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN amount_received NUMERIC(12, 2);

-- stock_returned: NULL enquanto o pedido não foi cancelado; TRUE = insumos devolvidos ao estoque;
-- FALSE = insumos já usados, registrados como perda.
ALTER TABLE orders ADD COLUMN cancel_reason   TEXT;
ALTER TABLE orders ADD COLUMN stock_returned  BOOLEAN;

-- Pedidos já entregues antes desta migração não ficam "a receber".
UPDATE orders SET paid = TRUE, paid_at = updated_at, amount_received = total WHERE status = 'DELIVERED';

CREATE INDEX ix_orders_paid_at ON orders (paid_at);
