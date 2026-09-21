import type { Category, OrderStatus, OrderType, PaymentMethod, ProductType, Role } from "./types";

export const categoryLabels: Record<Category, string> = {
  PIZZA: "Pizza",
  HAMBURGUER: "Hambúrguer",
  DRINK: "Bebida",
  DESSERT: "Sobremesa",
  SIDE: "Acompanhamento",
};

export const productTypeLabels: Record<ProductType, string> = {
  SIMPLE: "Simples",
  PIZZA_HALF: "Meia Pizza",
  PIZZA_QUARTER: "Pizza em 1/4",
  COMBO: "Combo",
};

export const orderTypeLabels: Record<OrderType, string> = {
  DELIVERY: "Entrega",
  TAKEAWAY: "Retirada",
  TABLE: "Mesa",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY: "Pronto",
  DELIVERING: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const orderStatusColors: Record<OrderStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  CONFIRMED: "bg-accent/20 text-accent-foreground",
  PREPARING: "bg-accent/30 text-accent-foreground",
  READY: "bg-success/15 text-success",
  DELIVERING: "bg-primary/15 text-primary",
  DELIVERED: "bg-success/20 text-success",
  CANCELLED: "bg-destructive/15 text-destructive",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  PIX: "Pix",
  IFOOD: "iFood",
  MEAL_TICKET: "Vale-refeição",
};

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  OPERATOR: "Operador",
};
