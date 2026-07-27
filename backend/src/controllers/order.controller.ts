import { Request, Response } from 'express';
import prisma from '../models/prisma';
import { AuthRequest } from '../middlewares/auth';
import { CreateOrderRequest } from '../types';

export class OrderController {
    static async create(req: AuthRequest, res: Response) {
        const orderData: CreateOrderRequest = req.body;
        const userId = req.user?.id!;

        // Calcular total
        let total = 0;
        const items = [];

        for (const item of orderData.items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
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
        const discount = orderData.discount || 0;
        const deliveryFee = orderData.deliveryFee || 0;
        total = total - discount + deliveryFee;

        // SQLite não suporta autoincrement() em campo que não seja o @id,
        // então o número sequencial do pedido é calculado aqui.
        const lastOrder = await prisma.order.findFirst({
            orderBy: { number: 'desc' }
        });
        const number = (lastOrder?.number || 0) + 1;

        const order = await prisma.order.create({
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

        // Baixar estoque (simplificado)
        for (const item of order.items) {
            const productIngredients = await prisma.productIngredient.findMany({
                where: { productId: item.productId },
                include: { ingredient: true }
            });

            for (const pi of productIngredients) {
                await prisma.ingredient.update({
                    where: { id: pi.ingredientId },
                    data: {
                        currentStock: {
                            decrement: pi.quantity * item.quantity
                        }
                    }
                });
            }
        }

        return res.status(201).json(order);
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
            }
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
                details: `Status alterado para ${status}`
            }
        });

        res.json(order);
    }
}
