import { Router } from 'express';
import { IngredientController } from '../controllers/ingredient.controller';
import { authMiddleware, adminOnly } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, IngredientController.findAll);
router.get('/low-stock', authMiddleware, IngredientController.getLowStock);
router.post('/', authMiddleware, adminOnly, IngredientController.create);
router.patch('/:id/stock', authMiddleware, adminOnly, IngredientController.updateStock);
router.put('/:id', authMiddleware, adminOnly, IngredientController.update);
router.delete('/:id', authMiddleware, adminOnly, IngredientController.delete);

export { router as ingredientRoutes };
