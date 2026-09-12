import { Request, Response } from 'express';
import prisma from '../models/prisma';
import { roundMoney } from '../utils/money';

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
            // Comparação entre duas colunas (currentStock <= minStock) não é
            // suportada pelo query builder do Prisma, então antes isso
            // trazia TODOS os ingredientes para a memória da API só para
            // filtrar em JS. Com $queryRaw a contagem é feita no próprio
            // banco, sem trafegar linhas desnecessárias.
            prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*) as count FROM ingredients WHERE currentStock <= minStock
            `.then((rows: { count: bigint }[]) => Number(rows[0]?.count ?? 0)),
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

        // Buscar detalhes dos produtos mais vendidos numa única query (antes
        // era um findUnique por produto dentro do map — N+1: com 5 produtos
        // eram 5 round-trips extras ao banco só para montar essa lista).
        const topProductIds = topProducts.map((item: { productId: string }) => item.productId);
        const topProductsRecords = await prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: {
                id: true,
                name: true,
                price: true
            }
        });
        const topProductById = new Map(
            topProductsRecords.map((p: { id: string; name: string; price: number }) => [p.id, p])
        );
        const topProductsDetails = topProducts.map((item: { productId: string; _sum: { quantity: number | null } }) => {
            const product = topProductById.get(item.productId) ?? { id: item.productId, name: '', price: 0 };
            return { ...product, totalSold: item._sum.quantity };
        });

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
            // SUM em floats acumulados ao longo de muitos pedidos pode
            // drift (ex: 1234.5600000000002). Arredondamos aqui pra
            // exibição, na saída da API, sem precisar mudar como o valor
            // é armazenado.
            totalRevenue: roundMoney(totalRevenue._sum.total || 0),
            pendingOrders,
            lowStock,
            todayOrders,
            todayRevenue: roundMoney(todayRevenue._sum.total || 0),
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
                    revenue: roundMoney(result._sum.total || 0)
                };
            })
        );

        res.json(revenue);
    }
}
