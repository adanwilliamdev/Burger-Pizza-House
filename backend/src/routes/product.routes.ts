import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware, adminOnly } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema';

const router = Router();

router.get('/', ProductController.findAll);
router.get('/:id', ProductController.findOne);
router.post('/', authMiddleware, adminOnly, validate(createProductSchema), ProductController.create);
router.put('/:id', authMiddleware, adminOnly, validate(updateProductSchema), ProductController.update);
router.delete('/:id', authMiddleware, adminOnly, ProductController.delete);

export { router as productRoutes };
