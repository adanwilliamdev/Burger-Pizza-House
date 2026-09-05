import { Request, Response } from 'express';
import { Ingredient } from '@prisma/client';
import prisma from '../models/prisma';

export class DashboardController {
    static async getStats(req: Request, res: Response) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [totalOrders, totalRevenue, pendingOrders, lowStock, topProducts] = await Promise.all([
            prisma.order.count(),
            prisma.order.aggregate({
                where: {
                    status: 'DELIVERED'
                },
                _sum: {
                    total: true
                }
            }),
            prisma.order.count({
                where: {
                    status: {
                        in: ['PENDING', 'CONFIRMED', 'PREPARING']
                    }
                }
            }),
            prisma.ingredient.findMany().then(
                (all: Ingredient[]) => all.filter((i: Ingredient) => i.currentStock <= i.minStock).length
            ),
            prisma.orderItem.groupBy({
                by: ['productId'],
                _sum: {
                    quantity: true
                },
                orderBy: {
                    _sum: {
                        quantity: 'desc'
                    }
                },
                take: 5
            })
        ]);

        // Buscar detalhes dos produtos mais vendidos
        const topProductsDetails = await Promise.all(
            topProducts.map(async (item: { productId: string; _sum: { quantity: number | null } }) => {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: {
                        id: true,
                        name: true,
                        price: true
                    }
                });
                return {
                    ...product,
                    totalSold: item._sum.quantity
                };
            })
        );

        const todayOrders = await prisma.order.count({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        const todayRevenue = await prisma.order.aggregate({
            where: {
                status: 'DELIVERED',
                createdAt: {
                    gte: today,
                    lt: tomorrow
                }
            },
            _sum: {
                total: true
            }
        });

        res.json({
            totalOrders,
            totalRevenue: totalRevenue._sum.total || 0,
            pendingOrders,
            lowStock,
            todayOrders,
            todayRevenue: todayRevenue._sum.total || 0,
            topProducts: topProductsDetails
        });
    }

    static async getRevenueByDay(req: Request, res: Response) {
        // `days` vem de query string (sempre string ou undefined) e não
        // passava por nenhuma validação — um valor gigante ou não numérico
        // (ex: ?days=999999) gerava centenas de milhares de queries em
        // paralelo (Promise.all abaixo), derrubando o servidor com um único
        // request. Limitamos a um intervalo razoável (1 a 90 dias).
        const rawDays = Number(req.query.days);
        const days = Number.isFinite(rawDays) ? Math.min(90, Math.max(1, Math.trunc(rawDays))) : 7;

        const dates = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            dates.push(date);
        }

        const revenue = await Promise.all(
            dates.map(async (date) => {
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);

                const result = await prisma.order.aggregate({
                    where: {
                        status: 'DELIVERED',
                        createdAt: {
                            gte: date,
                            lt: nextDay
                        }
                    },
                    _sum: {
                        total: true
                    }
                });

                return {
                    date: date.toISOString().split('T')[0],
                    revenue: result._sum.total || 0
                };
            })
        );

        res.json(revenue);
    }
}
