import { Request, Response } from 'express';
import { Ingredient } from '@prisma/client';
import prisma from '../models/prisma';
import { AuthRequest } from '../middlewares/auth';

export class IngredientController {
    static async create(req: AuthRequest, res: Response) {
        const { name, unit, currentStock, minStock, costPerUnit } = req.body;

        const ingredient = await prisma.ingredient.create({
            data: {
                name,
                unit: unit || 'g',
                currentStock: currentStock || 0,
                minStock: minStock || 0,
                costPerUnit
            }
        });

        res.status(201).json(ingredient);
    }

    static async findAll(req: Request, res: Response) {
        const ingredients = await prisma.ingredient.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        res.json(ingredients);
    }

    static async updateStock(req: AuthRequest, res: Response) {
        const { id } = req.params;
        const { quantity, operation } = req.body;

        const ingredient = await prisma.ingredient.update({
            where: { id },
            data: {
                currentStock: {
                    [operation === 'add' ? 'increment' : 'decrement']: quantity
                }
            }
        });

        res.json(ingredient);
    }

    static async update(req: AuthRequest, res: Response) {
        const { id } = req.params;
        const { name, unit, minStock, costPerUnit } = req.body;

        const ingredient = await prisma.ingredient.update({
            where: { id },
            data: {
                name,
                unit,
                minStock,
                costPerUnit
            }
        });

        res.json(ingredient);
    }

    static async delete(req: AuthRequest, res: Response) {
        const { id } = req.params;

        await prisma.ingredient.delete({
            where: { id }
        });

        res.status(204).send();
    }

    static async getLowStock(req: Request, res: Response) {
        // Prisma não suporta comparar uma coluna com outra coluna direto no
        // where (o `.fields` só existe em tempo de tipagem, não em runtime).
        // Buscamos tudo e filtramos em memória.
        const ingredients = await prisma.ingredient.findMany({
            orderBy: { name: 'asc' }
        });

        const lowStock = ingredients.filter((i: Ingredient) => i.currentStock <= i.minStock);

        res.json(lowStock);
    }
}
