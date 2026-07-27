import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../models/prisma';

export class AuthController {
    static async login(req: Request, res: Response) {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET.');
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { password: _, ...userWithoutPassword } = user;

        return res.json({
            user: userWithoutPassword,
            token
        });
    }

    static async register(req: Request, res: Response) {
        const { name, email, password, role } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'E-mail já cadastrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'OPERATOR'
            }
        });

        const { password: _, ...userWithoutPassword } = user;

        return res.status(201).json(userWithoutPassword);
    }

    static async me(req: Request, res: Response) {
        const userId = (req as any).user?.id;
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        return res.json(user);
    }
}
