package com.burgerpizzahouse.web;

import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.domain.PaymentMethod;
import com.burgerpizzahouse.dto.CatalogDtos.ProductResponse;
import com.burgerpizzahouse.dto.OrderDtos.OrderCreateRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderItemRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderResponse;
import com.burgerpizzahouse.security.AppUserDetails;
import com.burgerpizzahouse.service.BusinessException;
import com.burgerpizzahouse.service.InsufficientStockException;
import com.burgerpizzahouse.service.OrderService;
import com.burgerpizzahouse.service.ProductService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class OrderViewController {

    /** Linha do carrinho já com os dados do produto, pronta para exibir. */
    public record CartLineView(Long productId, String name, BigDecimal unitPrice, int quantity,
                               BigDecimal lineTotal, String notes) {
    }

    private final OrderService orders;
    private final ProductService products;
    private final OrderDraft draft;

    public OrderViewController(OrderService orders, ProductService products, OrderDraft draft) {
        this.orders = orders;
        this.products = products;
        this.draft = draft;
    }

    // ------------------------------------------------------------------ listagem / detalhe

    @GetMapping("/orders")
    public String list(@RequestParam(required = false) OrderStatus status,
                       @RequestParam(required = false) OrderType type, Model model) {
        model.addAttribute("orders", orders.list(status, type, null, null, 500, 0));
        model.addAttribute("filterStatus", status);
        model.addAttribute("filterType", type);
        return "orders/list";
    }

    @GetMapping("/orders/{id:\\d+}")
    public String detail(@PathVariable Long id, Model model, RedirectAttributes redirect) {
        try {
            model.addAttribute("order", orders.get(id));
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
            return "redirect:/orders";
        }
        return "orders/detail";
    }

    @PostMapping("/orders/{id:\\d+}/status")
    public String updateStatus(@PathVariable Long id, @RequestParam OrderStatus status,
                               @AuthenticationPrincipal AppUserDetails me, RedirectAttributes redirect) {
        try {
            orders.updateStatus(id, status, me.getId());
            redirect.addFlashAttribute("success", "Status atualizado para \"" + status.getLabel() + "\".");
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/orders/" + id;
    }

    // ------------------------------------------------------------------------ novo pedido

    @GetMapping("/orders/new")
    public String newOrder(Model model) {
        List<ProductResponse> active = products.list(null, true, null);
        Map<Long, ProductResponse> byId = new LinkedHashMap<>();
        active.forEach(p -> byId.put(p.id(), p));

        // Itens cujo produto sumiu/foi desativado saem do carrinho.
        draft.getLines().keySet().removeIf(id -> !byId.containsKey(id));

        List<CartLineView> cart = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrderDraft.Line line : draft.getLines().values()) {
            ProductResponse p = byId.get(line.getProductId());
            BigDecimal lineTotal = p.price().multiply(BigDecimal.valueOf(line.getQuantity()));
            subtotal = subtotal.add(lineTotal);
            cart.add(new CartLineView(p.id(), p.name(), p.price(), line.getQuantity(), lineTotal, line.getNotes()));
        }
        BigDecimal discount = parseMoney(draft.getDiscount());
        BigDecimal fee = draft.getType() == OrderType.DELIVERY ? parseMoney(draft.getDeliveryFee()) : BigDecimal.ZERO;
        BigDecimal total = subtotal.subtract(discount).add(fee).max(BigDecimal.ZERO);

        List<ProductResponse> tiles = active.stream()
                .filter(p -> draft.getCategory().isEmpty() || p.category().name().equals(draft.getCategory()))
                .toList();

        model.addAttribute("tiles", tiles);
        model.addAttribute("cart", cart);
        model.addAttribute("subtotal", subtotal);
        model.addAttribute("total", total);
        model.addAttribute("draft", draft);
        return "orders/new";
    }

    /** Ações do carrinho (add:ID, inc:ID, dec:ID, remove:ID, category:X, refresh): guardam o formulário e voltam. */
    @PostMapping("/orders/new/update")
    public String update(@RequestParam Map<String, String> params,
                         @RequestParam(name = "op", defaultValue = "refresh") String op,
                         RedirectAttributes redirect) {
        applyForm(params);

        int sep = op.indexOf(':');
        String action = sep < 0 ? op : op.substring(0, sep);
        String arg = sep < 0 ? "" : op.substring(sep + 1);
        try {
            switch (action) {
                case "add" -> draft.add(Long.parseLong(arg));
                case "inc" -> draft.changeQuantity(Long.parseLong(arg), 1);
                case "dec" -> draft.changeQuantity(Long.parseLong(arg), -1);
                case "remove" -> draft.remove(Long.parseLong(arg));
                case "category" -> draft.setCategory(isCategory(arg) ? arg : "");
                default -> { /* refresh: só mantém o que foi digitado */ }
            }
        } catch (NumberFormatException e) {
            redirect.addFlashAttribute("error", "Ação inválida.");
        }
        return "redirect:/orders/new";
    }

    @PostMapping("/orders/new/submit")
    public String submit(@RequestParam Map<String, String> params, @AuthenticationPrincipal AppUserDetails me,
                         RedirectAttributes redirect) {
        applyForm(params);

        if (draft.getLines().isEmpty()) {
            redirect.addFlashAttribute("error", "Adicione ao menos um item ao pedido.");
            return "redirect:/orders/new";
        }

        boolean delivery = draft.getType() == OrderType.DELIVERY;
        List<OrderItemRequest> items = draft.getLines().values().stream()
                .map(l -> new OrderItemRequest(l.getProductId(), l.getQuantity(),
                        l.getNotes().isBlank() ? null : l.getNotes(), List.of()))
                .toList();
        OrderCreateRequest request;
        try {
            request = new OrderCreateRequest(draft.getCustomerName(), draft.getCustomerPhone(),
                    delivery ? draft.getCustomerAddress() : null, draft.getType(), draft.getPaymentMethod(), items,
                    parseMoneyStrict(draft.getDiscount()),
                    delivery ? parseMoneyStrict(draft.getDeliveryFee()) : BigDecimal.ZERO,
                    draft.getNote());
        } catch (NumberFormatException e) {
            redirect.addFlashAttribute("error", "Desconto e taxa de entrega precisam ser números válidos.");
            return "redirect:/orders/new";
        }

        try {
            OrderResponse created = orders.create(me.getId(), request);
            draft.clear();
            redirect.addFlashAttribute("success", "Pedido #" + created.number() + " criado com sucesso.");
            return "redirect:/orders/" + created.id();
        } catch (InsufficientStockException e) {
            redirect.addFlashAttribute("error", e.describe());
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/orders/new";
    }

    // ----------------------------------------------------------------------------- helpers

    /** Copia para o rascunho tudo o que o formulário enviou (campos do cliente e observações por item). */
    private void applyForm(Map<String, String> params) {
        copy(params, "customerName", draft::setCustomerName);
        copy(params, "customerPhone", draft::setCustomerPhone);
        copy(params, "customerAddress", draft::setCustomerAddress);
        copy(params, "discount", draft::setDiscount);
        copy(params, "deliveryFee", draft::setDeliveryFee);
        copy(params, "note", draft::setNote);
        if (params.containsKey("type")) {
            try {
                draft.setType(OrderType.valueOf(params.get("type")));
            } catch (IllegalArgumentException ignored) {
                // mantém o valor anterior
            }
        }
        if (params.containsKey("paymentMethod")) {
            try {
                draft.setPaymentMethod(PaymentMethod.valueOf(params.get("paymentMethod")));
            } catch (IllegalArgumentException ignored) {
                // mantém o valor anterior
            }
        }
        for (OrderDraft.Line line : draft.getLines().values()) {
            String notes = params.get("notes_" + line.getProductId());
            if (notes != null) {
                line.setNotes(notes);
            }
        }
    }

    private static void copy(Map<String, String> params, String key, java.util.function.Consumer<String> setter) {
        if (params.containsKey(key)) {
            setter.accept(params.get(key));
        }
    }

    private static boolean isCategory(String value) {
        for (Category c : Category.values()) {
            if (c.name().equals(value)) {
                return true;
            }
        }
        return false;
    }

    /** Para exibição: valor inválido conta como zero. */
    private static BigDecimal parseMoney(String value) {
        try {
            return parseMoneyStrict(value);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    /** Aceita vazio (zero), ponto ou vírgula decimal; lança NumberFormatException se inválido ou negativo. */
    private static BigDecimal parseMoneyStrict(String value) {
        if (value == null || value.isBlank()) {
            return BigDecimal.ZERO;
        }
        BigDecimal parsed = new BigDecimal(value.strip().replace(',', '.'));
        if (parsed.signum() < 0) {
            throw new NumberFormatException("negativo");
        }
        return parsed;
    }
}
