export interface TokenPayload {
    id: string;
    email: string;
    role: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface CreateOrderRequest {
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    type: string;
    paymentMethod: string;
    items: Array<{
        productId: string;
        quantity: number;
        halfFlavors?: string[];
        notes?: string;
    }>;
    discount?: number;
    deliveryFee?: number;
    note?: string;
}
