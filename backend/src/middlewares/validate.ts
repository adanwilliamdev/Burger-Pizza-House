import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware genérico de validação com Zod.
 *
 * Valida `req.body` contra o schema informado. Se a validação passar,
 * substitui `req.body` pelo resultado "parseado" (já com defaults
 * aplicados e tipos coeridos), garantindo que os controllers só
 * recebam dados já validados e no formato esperado.
 */
export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            return next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    error: 'Dados inválidos',
                    details: error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            return next(error);
        }
    };
};
