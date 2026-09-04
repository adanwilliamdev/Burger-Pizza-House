import { z } from 'zod';

export const createIngredientSchema = z.object({
    name: z.string({ required_error: 'Nome é obrigatório' }).trim().min(1, 'Nome é obrigatório'),
    unit: z.string().default('g'),
    currentStock: z.number().nonnegative('Estoque não pode ser negativo').default(0),
    minStock: z.number().nonnegative('Estoque mínimo não pode ser negativo').default(0),
    costPerUnit: z.number({ required_error: 'costPerUnit é obrigatório' }).nonnegative('Custo não pode ser negativo')
});

export const updateIngredientSchema = z.object({
    name: z.string().trim().min(1, 'Nome é obrigatório').optional(),
    unit: z.string().optional(),
    minStock: z.number().nonnegative('Estoque mínimo não pode ser negativo').optional(),
    costPerUnit: z.number().nonnegative('Custo não pode ser negativo').optional()
});

export const updateStockSchema = z.object({
    quantity: z.number().positive('quantity deve ser maior que zero'),
    operation: z.enum(['add', 'remove'])
});
