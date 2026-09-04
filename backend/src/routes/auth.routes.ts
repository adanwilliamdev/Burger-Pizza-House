import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware, adminOnly } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { loginLimiter } from '../middlewares/rateLimiter';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), AuthController.login);

// Criação de novos usuários é restrita a administradores autenticados.
// Isso evita que qualquer pessoa se cadastre direto pela API com
// role: 'ADMIN' e ganhe acesso total ao sistema. O primeiro admin é
// criado via `npm run seed` (ver backend/src/seed.ts).
router.post('/register', authMiddleware, adminOnly, validate(registerSchema), AuthController.register);

router.get('/me', authMiddleware, AuthController.me);

export { router as authRoutes };
