export type Role = "ADMIN" | "MANAGER" | "OPERATOR";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Category = "PIZZA" | "HAMBURGUER" | "DRINK" | "DESSERT" | "SIDE";
export type ProductType = "SIMPLE" | "PIZZA_HALF" | "PIZZA_QUARTER" | "COMBO";

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  created_at: string;
  updated_at: string;
  is_low_stock: boolean;
}

export interface ProductIngredientLine {
  id?: number;
  ingredient_id: number;
  ingredient_name?: string;
  quantity: number;
  unit: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  category: Category;
  type: ProductType;
  is_active: boolean;
  image: string | null;
  preparation_time: number;
  created_at: string;
  updated_at: string;
  ingredients: ProductIngredientLine[];
}

export type OrderType = "DELIVERY" | "TAKEAWAY" | "TABLE";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "DELIVERING"
  | "DELIVERED"
  | "CANCELLED";
export type PaymentMethod = "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "IFOOD" | "MEAL_TICKET";

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  half_flavors: string[];
}

export interface Order {
  id: number;
  number: number;
  user: { id: number; name: string; email: string };
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  type: OrderType;
  status: OrderStatus;
  payment_method: PaymentMethod;
  total: number;
  discount: number;
  delivery_fee: number;
  subtotal: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  allowed_next_statuses: OrderStatus[];
}

export interface CartLine {
  product: Product;
  quantity: number;
  notes: string;
  half_flavors: string[];
}

export interface DashboardSummary {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  low_stock: number;
  today_orders: number;
  today_revenue: number;
  top_products: { id: number; name: string; price: number; total_sold: number }[];
  revenue_by_day: { date: string; revenue: number }[];
  max_revenue: number;
  recent_orders: Order[];
  days: number;
}

export interface ApiError {
  detail: string | { message: string; shortages?: unknown[] };
}
