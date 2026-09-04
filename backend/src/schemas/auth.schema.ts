import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string({ required_error: 'E-mail é obrigatório' }).email('E-mail inválido'),
    password: z.string({ required_error: 'Senha é obrigatória' }).min(1, 'Senha é obrigatória')
});

// O registro agora só pode ser feito por um ADMIN autenticado (ver auth.routes.ts).
// Ainda assim validamos e restringimos os valores aceitos para `role`,
// para impedir a criação de papéis inválidos ou inesperados.
export const registerSchema = z.object({
    name: z.string({ required_error: 'Nome é obrigatório' }).trim().min(2, 'Nome muito curto'),
    email: z.string({ required_error: 'E-mail é obrigatório' }).email('E-mail inválido'),
    password: z
        .string({ required_error: 'Senha é obrigatória' })
        .min(6, 'Senha deve ter ao menos 6 caracteres'),
    role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR']).default('OPERATOR')
});
