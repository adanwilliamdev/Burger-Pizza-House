import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/stats', authMiddleware, DashboardController.getStats);
router.get('/revenue', authMiddleware, DashboardController.getRevenueByDay);

export { router as dashboardRoutes };
