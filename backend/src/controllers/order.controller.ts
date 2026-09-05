import { Request, Response } from 'express';
import prisma from '../models/prisma';
import { AuthRequest } from '../middlewares/auth';
import { CreateOrderRequest } from '../types';

/**
 * Erro de negócio (não é um bug) usado para abortar a transação quando não
 * há estoque suficiente de algum ingrediente. Fica dentro do controller
 * porque só é usado aqui; se crescer, mover para um arquivo de erros
 * compartilhado.
 */
class InsufficientStockError extends Error {
    constructor(public readonly details: { ingredientId: string; ingredientName: string; required: number; available: number }[]) {
        super('Estoque insuficiente para um ou mais ingredientes');
        this.name = 'InsufficientStockError';
    }
}

// Transições de status permitidas. Um pedido só pode avançar no fluxo
// (ou ser cancelado a partir de qualquer estado que não seja terminal) —
// nunca "voltar" ou pular etapas, e nada muda a partir de um estado
// terminal (DELIVERED/CANCELLED).
const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['DELIVERING', 'DELIVERED', 'CANCELLED'],
    DELIVERING: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: []
};

export class OrderController {
    static async create(req: AuthRequest, res: Response) {
        const orderData: CreateOrderRequest = req.body;
        const userId = req.user?.id!;

        try {
            const order = await prisma.$transaction(async (tx) => {
                // Calcular total
                let total = 0;
                const items = [];

                for (const item of orderData.items) {
                    const product = await tx.product.findUnique({
                        where: { id: item.productId }
                    });

                    if (!product) {
                        throw Object.assign(new Error('Produto não encontrado'), { status: 404 });
                    }

                    if (!product.isActive) {
                        throw Object.assign(new Error(`Produto "${product.name}" não está mais disponível`), { status: 400 });
                    }

                    const unitPrice = product.price;
                    const totalPrice = unitPrice * item.quantity;
                    total += totalPrice;

                    items.push({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice,
                        totalPrice,
                        notes: item.notes || null,
                        halfFlavors: item.halfFlavors ? JSON.stringify(item.halfFlavors) : null
                    });
                }

                // Aplicar desconto
                const subtotal = total;
                const discount = orderData.discount || 0;
                const deliveryFee = orderData.deliveryFee || 0;

                if (discount > subtotal) {
                    throw Object.assign(
                        new Error('O desconto não pode ser maior que o subtotal do pedido'),
                        { status: 400 }
                    );
                }

                total = subtotal - discount + deliveryFee;

                // Somar a quantidade necessária de cada ingrediente em TODOS os
                // itens do pedido antes de decidir se dá pra confirmar o
                // pedido — evita vender além do estoque quando o mesmo
                // ingrediente aparece em produtos diferentes do carrinho.
                const requiredByIngredient = new Map<string, number>();
                for (const item of orderData.items) {
                    const productIngredients = await tx.productIngredient.findMany({
                        where: { productId: item.productId }
                    });
                    for (const pi of productIngredients) {
                        const needed = pi.quantity * item.quantity;
                        requiredByIngredient.set(
                            pi.ingredientId,
                            (requiredByIngredient.get(pi.ingredientId) || 0) + needed
                        );
                    }
                }

                if (requiredByIngredient.size > 0) {
                    const ingredientIds = Array.from(requiredByIngredient.keys());
                    const ingredients = await tx.ingredient.findMany({
                        where: { id: { in: ingredientIds } }
                    });
                    const ingredientById = new Map(ingredients.map((i) => [i.id, i]));

                    const shortages: { ingredientId: string; ingredientName: string; required: number; available: number }[] = [];
                    for (const [ingredientId, required] of requiredByIngredient) {
                        const ingredient = ingredientById.get(ingredientId);
                        const available = ingredient?.currentStock ?? 0;
                        if (available < required) {
                            shortages.push({
                                ingredientId,
                                ingredientName: ingredient?.name || ingredientId,
                                required,
                                available
                            });
                        }
                    }

                    if (shortages.length > 0) {
                        throw new InsufficientStockError(shortages);
                    }
                }

                // Número sequencial do pedido: lido e escrito dentro da MESMA
                // transação. SQLite serializa transações de escrita (um único
                // escritor por vez), então nenhuma outra transação consegue
                // ler `lastOrder` até esta commitar — isso elimina a condição
                // de corrida em que dois pedidos simultâneos recebiam o
                // mesmo número. (Sob concorrência muito alta o SQLite pode
                // responder "database is locked"; para volumes maiores de
                // pedidos simultâneos, considere Postgres ou uma tabela de
                // contador dedicada com `UPDATE ... RETURNING`.)
                const lastOrder = await tx.order.findFirst({
                    orderBy: { number: 'desc' }
                });
                const number = (lastOrder?.number || 0) + 1;

                const createdOrder = await tx.order.create({
                    data: {
                        number,
                        userId,
                        customerName: orderData.customerName,
                        customerPhone: orderData.customerPhone,
                        customerAddress: orderData.customerAddress,
                        type: orderData.type as any,
                        paymentMethod: orderData.paymentMethod as any,
                        total,
                        discount,
                        deliveryFee,
                        note: orderData.note,
                        items: {
                            create: items
                        }
                    },
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                });

                // Baixar estoque — já validamos acima que há saldo suficiente
                // para todos os ingredientes, então isso não deveria mais
                // deixar nenhum currentStock negativo.
                for (const [ingredientId, amount] of requiredByIngredient) {
                    await tx.ingredient.update({
                        where: { id: ingredientId },
                        data: { currentStock: { decrement: amount } }
                    });
                }

                return createdOrder;
            });

            return res.status(201).json(order);
        } catch (error: any) {
            if (error instanceof InsufficientStockError) {
                return res.status(409).json({
                    error: error.message,
                    shortages: error.details
                });
            }
            if (error?.status) {
                return res.status(error.status).json({ error: error.message });
            }
            throw error; // deixa o errorHandler global tratar o resto
        }
    }

    static async findAll(req: Request, res: Response) {
        const { status, type, startDate, endDate } = req.query;

        const orders = await prisma.order.findMany({
            where: {
                ...(status && { status: status as any }),
                ...(type && { type: type as any }),
                ...(startDate && endDate && {
                    createdAt: {
                        gte: new Date(startDate as string),
                        lte: new Date(endDate as string)
                    }
                })
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            // Sem paginação real ainda (o frontend em Orders.tsx/Dashboard.tsx
            // espera um array puro em response.data) — por ora só um teto de
            // segurança para não trazer o histórico inteiro de uma vez.
            // Ver README/roadmap: paginação de verdade requer atualizar o
            // frontend para consumir { items, total, page } antes de mudar
            // este formato de resposta.
            take: 500
        });

        res.json(orders);
    }

    static async findOne(req: Request, res: Response) {
        const { id } = req.params;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        return res.json(order);
    }

    static async updateStatus(req: AuthRequest, res: Response) {
        const { id } = req.params;
        const { status } = req.body;

        const existing = await prisma.order.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const allowedNext = ORDER_STATUS_TRANSITIONS[existing.status] || [];
        if (!allowedNext.includes(status)) {
            return res.status(409).json({
                error: `Não é possível mudar o status de "${existing.status}" para "${status}"`,
                currentStatus: existing.status,
                allowedNextStatuses: allowedNext
            });
        }

        const order = await prisma.order.update({
            where: { id },
            data: {
                status: status as any
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        // Registrar log
        await prisma.auditLog.create({
            data: {
                userId: req.user?.id!,
                action: 'UPDATE_ORDER_STATUS',
                entity: 'Order',
                entityId: id,
                details: `Status alterado de ${existing.status} para ${status}`
            }
        });

        res.json(order);
    }
}
