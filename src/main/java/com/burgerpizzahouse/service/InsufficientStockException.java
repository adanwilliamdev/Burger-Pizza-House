package com.burgerpizzahouse.service;

import com.burgerpizzahouse.dto.OrderDtos.StockShortage;
import java.util.List;
import org.springframework.http.HttpStatus;

/** Falta estoque de algum ingrediente para atender TODOS os itens do pedido. */
public class InsufficientStockException extends BusinessException {

    private final List<StockShortage> shortages;

    public InsufficientStockException(List<StockShortage> shortages) {
        super(HttpStatus.CONFLICT, "Estoque insuficiente para um ou mais ingredientes");
        this.shortages = shortages;
    }

    public List<StockShortage> getShortages() {
        return shortages;
    }

    /** Mensagem amigável para a tela, citando cada ingrediente em falta. */
    public String describe() {
        StringBuilder sb = new StringBuilder("Estoque insuficiente: ");
        for (int i = 0; i < shortages.size(); i++) {
            StockShortage s = shortages.get(i);
            if (i > 0) {
                sb.append("; ");
            }
            sb.append(s.ingredientName())
                    .append(" (necessário ").append(s.required().stripTrailingZeros().toPlainString())
                    .append(", disponível ").append(s.available().stripTrailingZeros().toPlainString())
                    .append(')');
        }
        return sb.toString();
    }
}
