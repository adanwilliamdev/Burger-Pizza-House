import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
