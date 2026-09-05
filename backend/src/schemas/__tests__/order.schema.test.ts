import { createOrderSchema, updateOrderStatusSchema } from '../order.schema';

describe('createOrderSchema', () => {
    const baseOrder = {
        type: 'DELIVERY',
        paymentMethod: 'PIX',
        items: [{ productId: 'prod-1', quantity: 2 }]
    };

    it('aceita um pedido mínimo válido', () => {
        const result = createOrderSchema.safeParse(baseOrder);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.discount).toBe(0);
            expect(result.data.deliveryFee).toBe(0);
        }
    });

    it('rejeita pedido sem itens', () => {
        const result = createOrderSchema.safeParse({ ...baseOrder, items: [] });
        expect(result.success).toBe(false);
    });

    it('rejeita quantity zero ou negativa', () => {
        const result = createOrderSchema.safeParse({
            ...baseOrder,
            items: [{ productId: 'prod-1', quantity: 0 }]
        });
        expect(result.success).toBe(false);
    });

    it('rejeita quantity fracionária', () => {
        const result = createOrderSchema.safeParse({
            ...baseOrder,
            items: [{ productId: 'prod-1', quantity: 1.5 }]
        });
        expect(result.success).toBe(false);
    });

    it('rejeita discount negativo', () => {
        const result = createOrderSchema.safeParse({ ...baseOrder, discount: -10 });
        expect(result.success).toBe(false);
    });

    it('rejeita type fora do enum', () => {
        const result = createOrderSchema.safeParse({ ...baseOrder, type: 'DRIVE_THRU' });
        expect(result.success).toBe(false);
    });

    it('rejeita paymentMethod fora do enum', () => {
        const result = createOrderSchema.safeParse({ ...baseOrder, paymentMethod: 'CRYPTO' });
        expect(result.success).toBe(false);
    });
});

describe('updateOrderStatusSchema', () => {
    it('aceita qualquer status dentro do enum', () => {
        for (const status of ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED']) {
            expect(updateOrderStatusSchema.safeParse({ status }).success).toBe(true);
        }
    });

    it('rejeita status arbitrário fora do enum', () => {
        const result = updateOrderStatusSchema.safeParse({ status: 'EM_ROTA_ALIENIGENA' });
        expect(result.success).toBe(false);
    });
});
