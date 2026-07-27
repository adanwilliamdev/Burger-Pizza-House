import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, OrderController.findAll);
router.get('/:id', authMiddleware, OrderController.findOne);
router.post('/', authMiddleware, OrderController.create);
router.patch('/:id/status', authMiddleware, OrderController.updateStatus);

export { router as orderRoutes };
