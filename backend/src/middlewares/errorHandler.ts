import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('❌ Erro:', error.message);
    
    if (error.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            error: 'Erro no banco de dados',
            details: error.message
        });
    }

    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token inválido'
        });
    }

    return res.status(error.status || 500).json({
        error: error.message || 'Erro interno do servidor'
    });
};
