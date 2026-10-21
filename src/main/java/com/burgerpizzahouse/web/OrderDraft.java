package com.burgerpizzahouse.web;

import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.domain.PaymentMethod;
import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.SessionScope;

/** Rascunho do pedido em andamento (carrinho + dados do cliente), guardado na sessão do usuário. */
@Component
@SessionScope
public class OrderDraft implements Serializable {

    private static final long serialVersionUID = 1L;

    public static class Line implements Serializable {
        private static final long serialVersionUID = 1L;

        private final long productId;
        private int quantity;
        private String notes = "";

        public Line(long productId, int quantity) {
            this.productId = productId;
            this.quantity = quantity;
        }

        public long getProductId() {
            return productId;
        }

        public int getQuantity() {
            return quantity;
        }

        public void setQuantity(int quantity) {
            this.quantity = quantity;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes == null ? "" : notes;
        }
    }

    private final Map<Long, Line> lines = new LinkedHashMap<>();
    private String category = "";
    private String customerName = "";
    private String customerPhone = "";
    private String customerAddress = "";
    private OrderType type = OrderType.DELIVERY;
    private PaymentMethod paymentMethod = PaymentMethod.CASH;
    private String discount = "0";
    private String deliveryFee = "0";
    private String note = "";

    public Map<Long, Line> getLines() {
        return lines;
    }

    public void add(long productId) {
        Line line = lines.get(productId);
        if (line == null) {
            lines.put(productId, new Line(productId, 1));
        } else {
            line.setQuantity(line.getQuantity() + 1);
        }
    }

    public void changeQuantity(long productId, int delta) {
        Line line = lines.get(productId);
        if (line == null) {
            return;
        }
        int next = line.getQuantity() + delta;
        if (next <= 0) {
            lines.remove(productId);
        } else {
            line.setQuantity(next);
        }
    }

    public void remove(long productId) {
        lines.remove(productId);
    }

    public void clear() {
        lines.clear();
        category = "";
        customerName = "";
        customerPhone = "";
        customerAddress = "";
        type = OrderType.DELIVERY;
        paymentMethod = PaymentMethod.CASH;
        discount = "0";
        deliveryFee = "0";
        note = "";
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category == null ? "" : category;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName == null ? "" : customerName;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone == null ? "" : customerPhone;
    }

    public String getCustomerAddress() {
        return customerAddress;
    }

    public void setCustomerAddress(String customerAddress) {
        this.customerAddress = customerAddress == null ? "" : customerAddress;
    }

    public OrderType getType() {
        return type;
    }

    public void setType(OrderType type) {
        this.type = type;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getDiscount() {
        return discount;
    }

    public void setDiscount(String discount) {
        this.discount = discount == null ? "" : discount;
    }

    public String getDeliveryFee() {
        return deliveryFee;
    }

    public void setDeliveryFee(String deliveryFee) {
        this.deliveryFee = deliveryFee == null ? "" : deliveryFee;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note == null ? "" : note;
    }
}
