/**
 * Helper de arredondamento monetário.
 *
 * O schema guarda valores em `Float` (reais, não centavos). Multiplicar e
 * somar floats repetidamente (unitPrice * quantity, subtotal - discount +
 * deliveryFee, agregações no dashboard, etc.) acumula erro de ponto
 * flutuante (ex: 0.1 + 0.2 !== 0.3), o que pode gerar totais com centavos
 * "fantasma" (R$ 19.999999999998 em vez de R$ 20).
 *
 * Migrar para inteiros em centavos (ou `Decimal`, trocando SQLite por
 * Postgres) seria a solução definitiva, mas exigiria uma migração de banco
 * e mudanças em todo o contrato da API/frontend. Como correção mais segura
 * e imediata, arredondamos para 2 casas decimais em todo ponto onde um
 * valor monetário é calculado, o que elimina o drift na prática para os
 * valores que o sistema manipula.
 */
export function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
