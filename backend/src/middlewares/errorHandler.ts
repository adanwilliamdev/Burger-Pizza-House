import { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

export const errorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // O erro completo (com stack trace) sempre vai pro log do servidor —
    // isso não muda entre ambientes, só a resposta HTTP é que varia.
    console.error('❌ Erro:', error);

    if (error.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            error: 'Erro no banco de dados',
            // Detalhes de baixo nível do Prisma (nomes de coluna/tabela,
            // constraints) só são úteis pra quem está desenvolvendo — em
            // produção, um cliente da API não deveria ver isso.
            details: isProduction ? undefined : error.message
        });
    }

    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token inválido'
        });
    }

    const status = error.status || 500;
    return res.status(status).json({
        // Para erros 5xx em produção, nunca expõe `error.message` (pode
        // vazar caminho de arquivo, versão de lib, detalhe de infra). Erros
        // 4xx (validação, regra de negócio) já são mensagens pensadas pra
        // aparecer pro usuário, então essas continuam passando normalmente.
        error: (isProduction && status >= 500)
            ? 'Erro interno do servidor'
            : (error.message || 'Erro interno do servidor')
    });
};
