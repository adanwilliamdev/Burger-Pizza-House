/**
 * Testes do OrderController.create/updateStatus com o Prisma inteiramente
 * mockado (não precisamos de um banco real nem do client do Prisma
 * gerado — só simulamos o formato dos retornos que os métodos usados
 * esperam). O foco aqui é comportamento, não persistência real:
 *   - pedido é criado dentro de uma única transação;
 *   - estoque insuficiente aborta a criação (409) sem decrementar nada;
 *   - desconto maior que o subtotal é rejeitado (400);
 *   - transições de status inválidas são rejeitadas (409).
 */

const mockTx = {
    product: { findUnique: jest.fn() },
    productIngredient: { findMany: jest.fn() },
    ingredient: { findMany: jest.fn(), update: jest.fn() },
    order: { findFirst: jest.fn(), create: jest.fn() }
};

const mockPrisma = {
    $transaction: jest.fn(async (callback: (tx: typeof mockTx) => Promise<any>) => callback(mockTx)),
    order: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    auditLog: { create: jest.fn() }
};

jest.mock('../../models/prisma', () => ({
    __esModule: true,
    default: mockPrisma
}));

// Importado depois do jest.mock acima, para garantir que o controller
// receba o prisma mockado em vez de tentar carregar o client real.
import { OrderController } from '../order.controller';

function makeRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function makeReq(overrides: any = {}) {
    return {
        body: {},
        params: {},
        query: {},
        user: { id: 'user-1', email: 'op@example.com', role: 'OPERATOR' },
        ...overrides
    } as any;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockTx));
});

describe('OrderController.create', () => {
    const validBody = {
        type: 'DELIVERY',
        paymentMethod: 'PIX',
        items: [{ productId: 'prod-1', quantity: 2 }],
        discount: 0,
        deliveryFee: 0
    };

    it('cria o pedido com sucesso quando há estoque suficiente', async () => {
        mockTx.product.findUnique.mockResolvedValue({
            id: 'prod-1',
            name: 'Pizza',
            price: 50,
            isActive: true
        });
        mockTx.productIngredient.findMany.mockResolvedValue([
            { ingredientId: 'ing-1', quantity: 1 }
        ]);
        mockTx.ingredient.findMany.mockResolvedValue([
            { id: 'ing-1', name: 'Queijo', currentStock: 10 }
        ]);
        mockTx.order.findFirst.mockResolvedValue({ number: 41 });
        mockTx.order.create.mockResolvedValue({ id: 'order-1', number: 42, total: 100 });

        const req = makeReq({ body: validBody });
        const res = makeRes();

        await OrderController.create(req, res);

        // A leitura do último número e a criação do pedido acontecem dentro
        // da MESMA transação (mockTx), não direto em mockPrisma — é isso
        // que elimina a condição de corrida do número sequencial.
        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
        expect(mockTx.order.findFirst).toHaveBeenCalled();
        expect(mockTx.order.create).toHaveBeenCalled();

        // Estoque só é decrementado depois de confirmar que há saldo.
        expect(mockTx.ingredient.update).toHaveBeenCalledWith({
            where: { id: 'ing-1' },
            data: { currentStock: { decrement: 2 } } // 1 (receita) * 2 (quantidade do item)
        });

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('rejeita com 409 quando não há estoque suficiente, sem decrementar nada', async () => {
        mockTx.product.findUnique.mockResolvedValue({
            id: 'prod-1',
            name: 'Pizza',
            price: 50,
            isActive: true
        });
        mockTx.productIngredient.findMany.mockResolvedValue([
            { ingredientId: 'ing-1', quantity: 5 }
        ]);
        mockTx.ingredient.findMany.mockResolvedValue([
            { id: 'ing-1', name: 'Queijo', currentStock: 3 } // precisa de 10 (5*2), só tem 3
        ]);

        const req = makeReq({ body: validBody });
        const res = makeRes();

        await OrderController.create(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        const payload = res.json.mock.calls[0][0];
        expect(payload.shortages).toEqual([
            expect.objectContaining({ ingredientId: 'ing-1', required: 10, available: 3 })
        ]);
        expect(mockTx.order.create).not.toHaveBeenCalled();
        expect(mockTx.ingredient.update).not.toHaveBeenCalled();
    });

    it('rejeita com 400 quando o produto não está mais ativo', async () => {
        mockTx.product.findUnique.mockResolvedValue({
            id: 'prod-1',
            name: 'Pizza',
            price: 50,
            isActive: false
        });

        const req = makeReq({ body: validBody });
        const res = makeRes();

        await OrderController.create(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockTx.order.create).not.toHaveBeenCalled();
    });

    it('rejeita com 400 quando o desconto é maior que o subtotal', async () => {
        mockTx.product.findUnique.mockResolvedValue({
            id: 'prod-1',
            name: 'Pizza',
            price: 50,
            isActive: true
        });
        mockTx.productIngredient.findMany.mockResolvedValue([]);

        const req = makeReq({ body: { ...validBody, discount: 999 } });
        const res = makeRes();

        await OrderController.create(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockTx.order.create).not.toHaveBeenCalled();
    });

    it('arredonda o total pra evitar drift de ponto flutuante (0.1 + 0.2 = 0.3, não 0.30000000000000004)', async () => {
        // Preço escolhido de propósito: 3 unidades a R$0,10 sem arredondar
        // dá 0.1 * 3 = 0.30000000000000004 em ponto flutuante.
        mockTx.product.findUnique.mockResolvedValue({
            id: 'prod-1',
            name: 'Refrigerante',
            price: 0.1,
            isActive: true
        });
        mockTx.productIngredient.findMany.mockResolvedValue([]);

        const req = makeReq({ body: { ...validBody, items: [{ productId: 'prod-1', quantity: 3 }] } });
        const res = makeRes();

        await OrderController.create(req, res);

        expect(mockTx.order.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ total: 0.3 })
            })
        );
    });
});

describe('OrderController.findAll', () => {
    function makeFindAllReq(query: any = {}) {
        return { query, params: {}, body: {} } as any;
    }

    it('sem page/pageSize, mantém compatibilidade e devolve um array puro (comportamento antigo)', async () => {
        const orders = [{ id: 'order-1' }, { id: 'order-2' }];
        mockPrisma.order.findMany.mockResolvedValue(orders);
        mockPrisma.order.count.mockResolvedValue(2);

        const req = makeFindAllReq();
        const res = makeRes();

        await OrderController.findAll(req, res);

        expect(res.json).toHaveBeenCalledWith(orders);
        // Sem paginação explícita, mantém o teto de segurança de 500 e não pagina.
        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 0, take: 500 })
        );
    });

    it('com page/pageSize, devolve { items, total, page, pageSize }', async () => {
        const orders = [{ id: 'order-3' }];
        mockPrisma.order.findMany.mockResolvedValue(orders);
        mockPrisma.order.count.mockResolvedValue(21);

        const req = makeFindAllReq({ page: '2', pageSize: '20' });
        const res = makeRes();

        await OrderController.findAll(req, res);

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 20, take: 20 })
        );
        expect(res.json).toHaveBeenCalledWith({ items: orders, total: 21, page: 2, pageSize: 20 });
    });

    it('limita pageSize a no máximo 100, mesmo se o cliente pedir mais', async () => {
        mockPrisma.order.findMany.mockResolvedValue([]);
        mockPrisma.order.count.mockResolvedValue(0);

        const req = makeFindAllReq({ page: '1', pageSize: '9999' });
        const res = makeRes();

        await OrderController.findAll(req, res);

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ skip: 0, take: 100 })
        );
    });
});

describe('OrderController.updateStatus', () => {
    it('permite uma transição válida (PENDING -> CONFIRMED) e registra auditoria', async () => {
        mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'PENDING' });
        mockPrisma.order.update.mockResolvedValue({ id: 'order-1', status: 'CONFIRMED' });

        const req = makeReq({ params: { id: 'order-1' }, body: { status: 'CONFIRMED' } });
        const res = makeRes();

        await OrderController.updateStatus(req, res);

        expect(mockPrisma.order.update).toHaveBeenCalled();
        expect(mockPrisma.auditLog.create).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ id: 'order-1', status: 'CONFIRMED' });
    });

    it('rejeita transição inválida (DELIVERED é terminal) com 409', async () => {
        mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'DELIVERED' });

        const req = makeReq({ params: { id: 'order-1' }, body: { status: 'PENDING' } });
        const res = makeRes();

        await OrderController.updateStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('rejeita pulo de etapa (PENDING -> DELIVERED direto) com 409', async () => {
        mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'PENDING' });

        const req = makeReq({ params: { id: 'order-1' }, body: { status: 'DELIVERED' } });
        const res = makeRes();

        await OrderController.updateStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('retorna 404 quando o pedido não existe', async () => {
        mockPrisma.order.findUnique.mockResolvedValue(null);

        const req = makeReq({ params: { id: 'nao-existe' }, body: { status: 'CONFIRMED' } });
        const res = makeRes();

        await OrderController.updateStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});
