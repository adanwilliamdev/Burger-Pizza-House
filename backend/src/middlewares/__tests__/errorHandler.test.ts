// (import feito dinamicamente dentro de loadErrorHandler, ver abaixo)


function makeRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

const originalEnv = process.env.NODE_ENV;
const originalConsoleError = console.error;

/**
 * `errorHandler.ts` calcula `isProduction` UMA VEZ no carregamento do
 * módulo (não a cada request) — por isso, pra testar os dois ambientes,
 * precisamos resetar o cache de módulos do Jest e reimportar depois de
 * ajustar NODE_ENV, em vez de só trocar a env var com o módulo já
 * carregado (o que não teria efeito nenhum).
 */
function loadErrorHandler(nodeEnv: string) {
    process.env.NODE_ENV = nodeEnv;
    jest.resetModules();
    return require('../errorHandler').errorHandler;
}

beforeEach(() => {
    console.error = jest.fn(); // silencia o log esperado durante os testes
});

afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    console.error = originalConsoleError;
});

describe('errorHandler', () => {
    it('em produção, oculta a mensagem de erro 5xx genérico', () => {
        const errorHandler = loadErrorHandler('production');
        const res = makeRes();

        errorHandler(new Error('detalhe interno sensível: caminho /var/app/x'), {} as any, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        const payload = res.json.mock.calls[0][0];
        expect(payload.error).toBe('Erro interno do servidor');
        expect(payload.error).not.toContain('sensível');
    });

    it('em desenvolvimento, mostra a mensagem de erro para facilitar debug', () => {
        const errorHandler = loadErrorHandler('development');
        const res = makeRes();

        errorHandler(new Error('detalhe interno'), {} as any, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json.mock.calls[0][0].error).toBe('detalhe interno');
    });

    it('erros de negócio (4xx) continuam com a mensagem original mesmo em produção', () => {
        const errorHandler = loadErrorHandler('production');
        const res = makeRes();
        const error = Object.assign(new Error('Estoque insuficiente'), { status: 409 });

        errorHandler(error, {} as any, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json.mock.calls[0][0].error).toBe('Estoque insuficiente');
    });

    it('esconde detalhes do Prisma em produção', () => {
        const errorHandler = loadErrorHandler('production');
        const res = makeRes();
        const error = Object.assign(new Error('Unique constraint failed on the fields: (`email`)'), {
            name: 'PrismaClientKnownRequestError'
        });

        errorHandler(error, {} as any, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].details).toBeUndefined();
    });

    it('token JWT inválido sempre retorna 401 com mensagem fixa', () => {
        const errorHandler = loadErrorHandler('development');
        const res = makeRes();
        const error = Object.assign(new Error('jwt malformed'), { name: 'JsonWebTokenError' });

        errorHandler(error, {} as any, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json.mock.calls[0][0].error).toBe('Token inválido');
    });
});
