import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import 'express-async-errors';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import { authRoutes } from './routes/auth.routes';
import { productRoutes } from './routes/product.routes';
import { orderRoutes } from './routes/order.routes';
import { ingredientRoutes } from './routes/ingredient.routes';
import { dashboardRoutes } from './routes/dashboard.routes';

dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error('❌ Variável de ambiente JWT_SECRET não definida. Configure-a no arquivo .env (veja .env.example).');
    process.exit(1);
}

// Impede subir o servidor com o placeholder do .env.example (alguém que
// copia o arquivo sem trocar o valor) ou com um segredo curto demais pra
// resistir a força bruta na assinatura do JWT.
const EXAMPLE_JWT_SECRET = 'coloque_aqui_uma_chave_secreta_forte_e_unica';
if (process.env.JWT_SECRET === EXAMPLE_JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error(
        '❌ JWT_SECRET está usando o valor de exemplo ou é curto demais (mínimo 32 caracteres). ' +
        "Gere um novo com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Origens permitidas para CORS, configuráveis via .env (lista separada por
// vírgula). Cai para os defaults de desenvolvimento se a variável não for
// definida, mas em produção ela deve sempre vir do .env.
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

// Middlewares
app.use(helmet());
app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use('/api', apiLimiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Rota de saúde
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: '🍕🍔 Burger & Pizza House ERP API está rodando!',
        timestamp: new Date().toISOString()
    });
});

// Middleware de erro
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/health`);
});
