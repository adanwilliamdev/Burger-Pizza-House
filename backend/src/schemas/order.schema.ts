import { z } from 'zod';

const orderItemSchema = z.object({
    productId: z.string().min(1, 'productId é obrigatório'),
    quantity: z.number().int('quantity deve ser um número inteiro').positive('quantity deve ser maior que zero'),
    halfFlavors: z.array(z.string()).optional(),
    notes: z.string().optional()
});

export const createOrderSchema = z.object({
    customerName: z.string().trim().optional(),
    customerPhone: z.string().trim().optional(),
    customerAddress: z.string().trim().optional(),
    type: z.enum(['DELIVERY', 'TAKEAWAY', 'TABLE']),
    paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'IFOOD', 'MEAL_TICKET']),
    items: z.array(orderItemSchema).min(1, 'O pedido precisa ter ao menos um item'),
    // Descontos e taxas nunca podem ser negativos aqui — a checagem de que o
    // desconto não é maior que o subtotal do pedido é feita no controller,
    // já que depende do preço dos produtos.
    discount: z.number().nonnegative('discount não pode ser negativo').default(0),
    deliveryFee: z.number().nonnegative('deliveryFee não pode ser negativo').default(0),
    note: z.string().optional()
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'])
});
