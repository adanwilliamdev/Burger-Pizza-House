"""
Cálculo puro (sem banco, sem dependências externas) de consumo e falta de
ingredientes. Isolado para ser testado com `python -m unittest`.
"""
from collections.abc import Iterable, Mapping, Sequence

# Casas decimais mantidas nas quantidades agregadas: evita lixo de ponto
# flutuante (0.1 * 3 = 0.30000000000000004) ao somar receitas.
_PRECISION = 6


def aggregate_required(
    items: Iterable[tuple[int, int]],
    recipes: Mapping[int, Sequence[tuple[int, float]]],
) -> dict[int, float]:
    """
    items:   (product_id, quantidade) de cada linha do pedido.
    recipes: product_id -> [(ingredient_id, quantidade por unidade)].

    Devolve ingredient_id -> total necessário, somando o mesmo ingrediente
    entre linhas e produtos diferentes.
    """
    required: dict[int, float] = {}
    for product_id, quantity in items:
        for ingredient_id, per_unit in recipes.get(product_id, ()):
            required[ingredient_id] = required.get(ingredient_id, 0.0) + per_unit * quantity
    return {k: round(v, _PRECISION) for k, v in required.items()}


def find_shortages(
    required: Mapping[int, float],
    available: Mapping[int, float],
    names: Mapping[int, str],
) -> list[dict]:
    """Lista os ingredientes cujo saldo não cobre o necessário."""
    shortages = []
    for ingredient_id in sorted(required):
        have = available.get(ingredient_id, 0.0)
        need = required[ingredient_id]
        # tolerância de 1e-9 para não recusar pedido por ruído de float
        if have + 1e-9 < need:
            shortages.append({
                "ingredient_id": ingredient_id,
                "ingredient_name": names.get(ingredient_id, str(ingredient_id)),
                "required": need,
                "available": have,
            })
    return shortages
