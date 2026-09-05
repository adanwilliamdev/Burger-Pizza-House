import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../types';

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Prioriza o cookie httpOnly (usado pelo frontend web — não fica
        // acessível via JavaScript, então um XSS não consegue mais roubar o
        // token direto do localStorage). Mantém o header `Authorization:
        // Bearer` como alternativa para chamadas feitas por scripts/serviços
        // externos que não usam cookies.
        const cookieToken = (req as any).cookies?.token;
        const headerToken = req.headers.authorization?.replace('Bearer ', '');
        const token = cookieToken || headerToken;

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
