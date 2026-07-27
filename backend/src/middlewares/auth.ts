import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../types';

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'JWT_SECRET não configurado no servidor' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
        req.user = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    return next();
};
