import { loginSchema, registerSchema } from '../auth.schema';

describe('loginSchema', () => {
    it('aceita e-mail e senha válidos', () => {
        const result = loginSchema.safeParse({ email: 'a@b.com', password: '123456' });
        expect(result.success).toBe(true);
    });

    it('rejeita e-mail inválido', () => {
        const result = loginSchema.safeParse({ email: 'not-an-email', password: '123456' });
        expect(result.success).toBe(false);
    });

    it('rejeita senha vazia', () => {
        const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
        expect(result.success).toBe(false);
    });
});

describe('registerSchema', () => {
    it('aceita payload válido e aplica default de role', () => {
        const result = registerSchema.safeParse({
            name: 'Fulano',
            email: 'a@b.com',
            password: '123456'
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe('OPERATOR');
        }
    });

    it('rejeita role fora do enum permitido (impede escalada de privilégio via valor arbitrário)', () => {
        const result = registerSchema.safeParse({
            name: 'Fulano',
            email: 'a@b.com',
            password: '123456',
            role: 'SUPERUSER'
        });
        expect(result.success).toBe(false);
    });

    it('aceita role ADMIN explicitamente (quem chama já passou pelo adminOnly na rota)', () => {
        const result = registerSchema.safeParse({
            name: 'Fulano',
            email: 'a@b.com',
            password: '123456',
            role: 'ADMIN'
        });
        expect(result.success).toBe(true);
    });

    it('rejeita senha curta demais', () => {
        const result = registerSchema.safeParse({
            name: 'Fulano',
            email: 'a@b.com',
            password: '123'
        });
        expect(result.success).toBe(false);
    });

    it('rejeita nome muito curto', () => {
        const result = registerSchema.safeParse({
            name: 'F',
            email: 'a@b.com',
            password: '123456'
        });
        expect(result.success).toBe(false);
    });
});
