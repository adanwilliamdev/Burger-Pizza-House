import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas/order.schema';

const router = Router();

router.get('/', authMiddleware, OrderController.findAll);
router.get('/:id', authMiddleware, OrderController.findOne);
router.post('/', authMiddleware, validate(createOrderSchema), OrderController.create);
router.patch('/:id/status', authMiddleware, validate(updateOrderStatusSchema), OrderController.updateStatus);

export { router as orderRoutes };
