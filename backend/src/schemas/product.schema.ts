import { z } from 'zod';

const productIngredientSchema = z.object({
    ingredientId: z.string().min(1, 'ingredientId é obrigatório'),
    quantity: z.number().positive('quantity deve ser maior que zero'),
    unit: z.string().optional()
});

export const createProductSchema = z.object({
    name: z.string({ required_error: 'Nome é obrigatório' }).trim().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    price: z.number({ required_error: 'Preço é obrigatório' }).nonnegative('Preço não pode ser negativo'),
    cost: z.number().nonnegative('Custo não pode ser negativo').optional(),
    category: z.enum(['PIZZA', 'HAMBURGUER', 'DRINK', 'DESSERT', 'SIDE']).default('PIZZA'),
    type: z.enum(['SIMPLE', 'PIZZA_HALF', 'PIZZA_QUARTER', 'COMBO']).default('SIMPLE'),
    preparationTime: z.number().int().positive().default(15),
    image: z.string().optional(),
    ingredients: z.array(productIngredientSchema).optional()
});

export const updateProductSchema = z.object({
    name: z.string().trim().min(1, 'Nome é obrigatório').optional(),
    description: z.string().optional(),
    price: z.number().nonnegative('Preço não pode ser negativo').optional(),
    cost: z.number().nonnegative('Custo não pode ser negativo').optional(),
    category: z.enum(['PIZZA', 'HAMBURGUER', 'DRINK', 'DESSERT', 'SIDE']).optional(),
    isActive: z.boolean().optional(),
    preparationTime: z.number().int().positive().optional()
});
