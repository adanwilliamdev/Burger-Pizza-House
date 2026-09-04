import { Router } from 'express';
import { IngredientController } from '../controllers/ingredient.controller';
import { authMiddleware, adminOnly } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createIngredientSchema, updateIngredientSchema, updateStockSchema } from '../schemas/ingredient.schema';

const router = Router();

router.get('/', authMiddleware, IngredientController.findAll);
router.get('/low-stock', authMiddleware, IngredientController.getLowStock);
router.post('/', authMiddleware, adminOnly, validate(createIngredientSchema), IngredientController.create);
router.patch('/:id/stock', authMiddleware, adminOnly, validate(updateStockSchema), IngredientController.updateStock);
router.put('/:id', authMiddleware, adminOnly, validate(updateIngredientSchema), IngredientController.update);
router.delete('/:id', authMiddleware, adminOnly, IngredientController.delete);

export { router as ingredientRoutes };
