def round_money(value: float) -> float:
    """
    Arredondamento monetário — mesmo raciocínio do `roundMoney` original em
    TypeScript: os valores são guardados como float (reais, não centavos),
    e somas/multiplicações repetidas acumulam erro de ponto flutuante
    (0.1 + 0.2 != 0.3). Arredondamos para 2 casas decimais em todo ponto
    onde um valor monetário é calculado.
    """
    return round(float(value) + 1e-9, 2)
