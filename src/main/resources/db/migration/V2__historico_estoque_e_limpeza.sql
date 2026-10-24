-- V2: preserva o histórico de estoque e remove coluna sem uso.

-- Excluir um ingrediente não pode mais apagar o livro-razão (antes: ON DELETE CASCADE).
-- A aplicação já recusa a exclusão de ingredientes com movimentações (IngredientService.delete).
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_ingredient_id_fkey;
ALTER TABLE stock_movements
    ADD CONSTRAINT fk_stock_movements_ingredient
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE RESTRICT;

-- "superuser" nunca foi usado pela aplicação.
ALTER TABLE users DROP COLUMN IF EXISTS superuser;
