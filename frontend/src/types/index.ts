export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  category: string;
  type: string;
  isActive: boolean;
  preparationTime: number;
  image?: string;
  ingredients: ProductIngredient[];
}

export interface ProductIngredient {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  quantity: number;
  unit: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
}

export interface Order {
  id: string;
  number: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  type: string;
  status: string;
  paymentMethod: string;
  total: number;
  discount: number;
  deliveryFee: number;
  note?: string;
  createdAt: string;
  items: OrderItem[];
  user: User;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  halfFlavors?: string[];
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStock: number;
  todayOrders: number;
  todayRevenue: number;
  topProducts: Array<{
    id: string;
    name: string;
    price: number;
    totalSold: number;
  }>;
}

export interface RevenueData {
  date: string;
  revenue: number;
}
