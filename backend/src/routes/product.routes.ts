import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

router.get('/', ProductController.findAll);
router.get('/:id', ProductController.findOne);
router.post('/', authMiddleware, adminOnly, ProductController.create);
router.put('/:id', authMiddleware, adminOnly, ProductController.update);
router.delete('/:id', authMiddleware, adminOnly, ProductController.delete);

export { router as productRoutes };
