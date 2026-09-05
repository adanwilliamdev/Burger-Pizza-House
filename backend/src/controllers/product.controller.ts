import { Request, Response } from 'express';
import prisma from '../models/prisma';
import { AuthRequest } from '../middlewares/auth';

export class ProductController {
    static async create(req: AuthRequest, res: Response) {
        const { name, description, price, cost, category, type, preparationTime, ingredients } = req.body;

        const product = await prisma.product.create({
            data: {
                name,
                description,
                price,
                cost: cost || 0,
                category,
                type: type || 'SIMPLE',
                preparationTime: preparationTime || 15,
                ingredients: ingredients ? {
                    create: ingredients.map((ing: any) => ({
                        ingredientId: ing.ingredientId,
                        quantity: ing.quantity,
                        unit: ing.unit || 'g'
                    }))
                } : undefined
            },
            include: {
                ingredients: {
                    include: {
                        ingredient: true
                    }
                }
            }
        });

        res.status(201).json(product);
    }

    static async findAll(req: Request, res: Response) {
        const { category, isActive } = req.query;

        const products = await prisma.product.findMany({
            where: {
                ...(category && { category: category as any }),
                ...(isActive !== undefined && { isActive: isActive === 'true' })
            },
            include: {
                ingredients: {
                    include: {
                        ingredient: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            },
            // Mesmo raciocínio de OrderController.findAll: o cardápio de um
            // restaurante real não passa de algumas centenas de itens, então
            // um teto de segurança resolve o risco de crescimento
            // descontrolado sem precisar de paginação de verdade (que exigiria
            // atualizar Products.tsx e Orders.tsx para paginar a UI).
            take: 500
        });

        res.json(products);
    }

    static async findOne(req: Request, res: Response) {
        const { id } = req.params;

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                ingredients: {
                    include: {
                        ingredient: true
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        return res.json(product);
    }

    static async update(req: AuthRequest, res: Response) {
        const { id } = req.params;
        const { name, description, price, cost, category, isActive, preparationTime } = req.body;

        const product = await prisma.product.update({
            where: { id },
            data: {
                name,
                description,
                price,
                cost,
                category,
                isActive,
                preparationTime
            },
            include: {
                ingredients: {
                    include: {
                        ingredient: true
                    }
                }
            }
        });

        res.json(product);
    }

    static async delete(req: AuthRequest, res: Response) {
        const { id } = req.params;

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });

        if (orderItemCount > 0) {
            // Produto já apareceu em algum pedido: apagar de verdade
            // destruiria o histórico desses pedidos (o relatório de vendas
            // mostraria itens "fantasma"). Em vez disso, desativamos —
            // o produto some do cardápio (GET /products?isActive=true)
            // mas os pedidos antigos continuam íntegros.
            const updated = await prisma.product.update({
                where: { id },
                data: { isActive: false }
            });
            return res.status(200).json({
                message: 'Produto possui pedidos associados; foi desativado em vez de excluído.',
                product: updated
            });
        }

        await prisma.product.delete({ where: { id } });
        return res.status(204).send();
    }
}
