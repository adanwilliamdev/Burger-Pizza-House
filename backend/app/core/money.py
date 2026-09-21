def round_money(value: float) -> float:
    """
    Arredondamento monetário — mesma lógica do `round_money` original em
    Python/Django (e do `roundMoney` em TypeScript antes dele): os valores
    são guardados como float (reais, não centavos) e somas/multiplicações
    repetidas acumulam erro de ponto flutuante (0.1 + 0.2 != 0.3).
    Arredondamos para 2 casas decimais em todo ponto onde um valor
    monetário é calculado.
    """
    return round(float(value) + 1e-9, 2)
