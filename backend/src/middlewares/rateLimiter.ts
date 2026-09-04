import rateLimit from 'express-rate-limit';

/**
 * Limita tentativas de login para dificultar ataques de força bruta.
 * 10 tentativas a cada 15 minutos, por IP.
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
    skipSuccessfulRequests: true
});

/**
 * Limite mais permissivo para o restante da API, como proteção geral
 * contra abuso/scraping.
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});
