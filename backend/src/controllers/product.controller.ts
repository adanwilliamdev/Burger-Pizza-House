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
            }
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

        await prisma.product.delete({
            where: { id }
        });

        res.status(204).send();
    }
}
