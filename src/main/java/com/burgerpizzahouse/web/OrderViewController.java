package com.burgerpizzahouse.web;

import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.domain.PaymentMethod;
import com.burgerpizzahouse.dto.CatalogDtos.ProductResponse;
import com.burgerpizzahouse.dto.OrderDtos.CashClosingResponse;
import com.burgerpizzahouse.dto.OrderDtos.OrderCreateRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderItemRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderResponse;
import com.burgerpizzahouse.dto.OrderDtos.OrderSummaryResponse;
import com.burgerpizzahouse.security.AppUserDetails;
import com.burgerpizzahouse.service.BusinessException;
import com.burgerpizzahouse.service.InsufficientStockException;
import com.burgerpizzahouse.service.OrderService;
import com.burgerpizzahouse.service.OrderService.OrderFilter;
import com.burgerpizzahouse.service.ProductService;
import jakarta.servlet.http.HttpServletResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.util.UriComponentsBuilder;

@Controller
public class OrderViewController {

    /** Linha do carrinho já com os dados do produto, pronta para exibir. */
    public record CartLineView(Long productId, String name, BigDecimal unitPrice, int quantity,
                               BigDecimal lineTotal, String notes, boolean pizza, Long halfWithId,
                               String halfWithName) {
    }

    private static final int PAGE_SIZE = 20;
    /** Teto só para o cálculo do offset não estourar com ?page=999999999. */
    private static final int MAX_PAGE = 100_000;
    private static final int MAX_QUERY_LENGTH = 100;

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
                       @RequestParam(required = false) OrderType type,
                       @RequestParam(name = "q", required = false) String q,
                       @RequestParam(name = "start_date", required = false)
                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                       @RequestParam(name = "end_date", required = false)
                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                       @RequestParam(defaultValue = "0") int page, Model model) {
        String query = q == null ? "" : q.strip();
        if (query.length() > MAX_QUERY_LENGTH) {
            query = query.substring(0, MAX_QUERY_LENGTH);
        }
        OrderFilter filter = new OrderFilter(status, type, startDate, endDate, query);

        int current = Math.max(0, Math.min(page, MAX_PAGE));
        Page<OrderSummaryResponse> result = orders.listSummaries(filter, PAGE_SIZE, (long) current * PAGE_SIZE);
        if (result.isEmpty() && result.getTotalElements() > 0) {
            // Página além do fim (ex.: link antigo depois de pedidos cancelados/filtrados): volta para a última.
            current = (int) ((result.getTotalElements() - 1) / PAGE_SIZE);
            result = orders.listSummaries(filter, PAGE_SIZE, (long) current * PAGE_SIZE);
        }

        model.addAttribute("orders", result.getContent());
        model.addAttribute("totalOrders", result.getTotalElements());
        model.addAttribute("pageNumber", current + 1);
        model.addAttribute("totalPages", Math.max(1, result.getTotalPages()));
        model.addAttribute("firstShown", result.isEmpty() ? 0 : (long) current * PAGE_SIZE + 1);
        model.addAttribute("lastShown", (long) current * PAGE_SIZE + result.getNumberOfElements());
        model.addAttribute("prevHref", current > 0 ? listHref(filter, current - 1) : null);
        model.addAttribute("nextHref", current + 1 < result.getTotalPages() ? listHref(filter, current + 1) : null);
        model.addAttribute("filterStatus", status);
        model.addAttribute("filterType", type);
        model.addAttribute("filterQuery", query);
        model.addAttribute("filterStart", startDate);
        model.addAttribute("filterEnd", endDate);
        model.addAttribute("hasFilters", status != null || type != null || !query.isEmpty()
                || startDate != null || endDate != null);
        return "orders/list";
    }

    /** Link da listagem preservando os filtros (valores codificados; parâmetros vazios ficam de fora). */
    static String listHref(OrderFilter filter, int page) {
        Map<String, Object> vars = new LinkedHashMap<>();
        if (filter.status() != null) {
            vars.put("status", filter.status().name());
        }
        if (filter.type() != null) {
            vars.put("type", filter.type().name());
        }
        if (filter.query() != null && !filter.query().isBlank()) {
            vars.put("q", filter.query().strip());
        }
        if (filter.startDate() != null) {
            vars.put("start_date", filter.startDate().toString());
        }
        if (filter.endDate() != null) {
            vars.put("end_date", filter.endDate().toString());
        }
        if (page > 0) {
            vars.put("page", page);
        }
        UriComponentsBuilder builder = UriComponentsBuilder.fromPath("/orders");
        vars.keySet().forEach(name -> builder.queryParam(name, "{" + name + "}"));
        return builder.encode().buildAndExpand(vars).toUriString();
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
                               @RequestParam(required = false) String cancelReason,
                               @RequestParam(required = false) String returnToStock,
                               @AuthenticationPrincipal AppUserDetails me, RedirectAttributes redirect) {
        try {
            Boolean giveBack = returnToStock == null || returnToStock.isBlank() ? null : Boolean.valueOf(returnToStock);
            orders.updateStatus(id, status, me.getId(), cancelReason, giveBack);
            redirect.addFlashAttribute("success", "Status atualizado para \"" + status.getLabel() + "\".");
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/orders/" + id;
    }

    @PostMapping("/orders/{id:\\d+}/payment")
    public String pay(@PathVariable Long id, @RequestParam(required = false) String amountReceived,
                      @AuthenticationPrincipal AppUserDetails me, RedirectAttributes redirect) {
        try {
            BigDecimal received = amountReceived == null || amountReceived.isBlank()
                    ? null : parseMoneyStrict(amountReceived);
            OrderResponse paid = orders.registerPayment(id, received, me.getId());
            redirect.addFlashAttribute("success", paid.change().signum() > 0
                    ? "Pagamento registrado. Troco: " + formatMoney(paid.change()) : "Pagamento registrado.");
        } catch (NumberFormatException e) {
            redirect.addFlashAttribute("error", "Informe um valor recebido válido.");
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/orders/" + id;
    }

    /** Fechamento de caixa do dia (ADMIN e MANAGER). */
    @GetMapping("/cash")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public String cash(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                       Model model) {
        CashClosingResponse closing = orders.cashClosing(date);
        model.addAttribute("closing", closing);
        return "orders/cash";
    }

    // ------------------------------------------------------------------------ novo pedido

    @GetMapping("/orders/new")
    public String newOrder(Model model) {
        populateOrderScreen(model);
        return "orders/new";
    }

    /** Monta o modelo da tela de novo pedido (página inteira ou fragmentos devolvidos ao htmx). */
    private void populateOrderScreen(Model model) {
        List<ProductResponse> active = products.list(null, true, null);
        Map<Long, ProductResponse> byId = new LinkedHashMap<>();
        active.forEach(p -> byId.put(p.id(), p));

        // Itens cujo produto sumiu/foi desativado saem do carrinho.
        draft.getLines().keySet().removeIf(id -> !byId.containsKey(id));

        List<CartLineView> cart = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrderDraft.Line line : draft.getLines().values()) {
            ProductResponse p = byId.get(line.getProductId());
            boolean pizza = p.category() == Category.PIZZA;
            ProductResponse other = line.getHalfWith() == null ? null : byId.get(line.getHalfWith());
            if (!pizza || other == null || other.category() != Category.PIZZA || other.id().equals(p.id())) {
                line.setHalfWith(null); // sabor sumiu/desativado ou deixou de ser válido
                other = null;
            }
            // meio a meio: preço do sabor mais caro
            BigDecimal unitPrice = other == null ? p.price() : p.price().max(other.price());
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(line.getQuantity()));
            subtotal = subtotal.add(lineTotal);
            cart.add(new CartLineView(p.id(), p.name(), unitPrice, line.getQuantity(), lineTotal, line.getNotes(),
                    pizza, other == null ? null : other.id(), other == null ? null : other.name()));
        }
        BigDecimal discount = parseMoney(draft.getDiscount());
        BigDecimal fee = draft.getType() == OrderType.DELIVERY ? parseMoney(draft.getDeliveryFee()) : BigDecimal.ZERO;
        BigDecimal total = subtotal.subtract(discount).add(fee).max(BigDecimal.ZERO);

        List<ProductResponse> tiles = active.stream()
                .filter(p -> draft.getCategory().isEmpty() || p.category().name().equals(draft.getCategory()))
                .toList();

        model.addAttribute("pizzaOptions", active.stream().filter(p -> p.category() == Category.PIZZA).toList());
        model.addAttribute("tiles", tiles);
        model.addAttribute("cart", cart);
        model.addAttribute("itemCount", cart.stream().mapToInt(CartLineView::quantity).sum());
        model.addAttribute("subtotal", subtotal);
        model.addAttribute("total", total);
        model.addAttribute("draft", draft);
    }

    /**
     * Ações do carrinho (add:ID, inc:ID, dec:ID, remove:ID, category:X, refresh): guardam o formulário no rascunho.
     * Via htmx (cabeçalho {@code HX-Request}) devolve só os pedaços da tela que mudaram; sem JavaScript continua o
     * fluxo clássico de POST + redirect.
     */
    @PostMapping("/orders/new/update")
    public String update(@RequestParam Map<String, String> params,
                         @RequestParam(name = "op", defaultValue = "refresh") String op,
                         @RequestHeader(name = "HX-Request", required = false) String htmx,
                         HttpServletResponse response, Model model, RedirectAttributes redirect) {
        applyForm(params);

        int sep = op.indexOf(':');
        String action = sep < 0 ? op : op.substring(0, sep);
        String arg = sep < 0 ? "" : op.substring(sep + 1);
        boolean invalid = false;
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
            invalid = true;
        }

        if (htmx != null) {
            if (invalid) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST); // o htmx não troca o conteúdo em 4xx
            }
            populateOrderScreen(model);
            return "category".equals(action) ? "orders/new-fragments :: catalog" : "orders/new-fragments :: cartUpdate";
        }
        if (invalid) {
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
        Map<Long, String> names = new LinkedHashMap<>();
        products.list(null, true, null).forEach(p -> names.put(p.id(), p.name()));
        List<OrderItemRequest> items = draft.getLines().values().stream()
                .map(l -> new OrderItemRequest(l.getProductId(), l.getQuantity(),
                        l.getNotes().isBlank() ? null : l.getNotes(),
                        l.getHalfWith() != null && names.containsKey(l.getHalfWith())
                                ? List.of(names.get(l.getHalfWith())) : List.of()))
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
            String half = params.get("half_" + line.getProductId());
            if (half != null) {
                try {
                    line.setHalfWith(half.isBlank() ? null : Long.valueOf(half.strip()));
                } catch (NumberFormatException ignored) {
                    line.setHalfWith(null);
                }
            }
        }
    }

    private static void copy(Map<String, String> params, String key, java.util.function.Consumer<String> setter) {
        if (params.containsKey(key)) {
            setter.accept(params.get(key));
        }
    }

    private static String formatMoney(BigDecimal value) {
        return "R$ " + value.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString().replace('.', ',');
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
