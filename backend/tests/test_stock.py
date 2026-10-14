"""Testes unitários do cálculo de estoque — sem banco, sem dependências: `python -m unittest`."""
import unittest

from app.services.stock import aggregate_required, find_shortages


class AggregateRequiredTests(unittest.TestCase):
    def test_sums_same_ingredient_across_products_and_lines(self):
        recipes = {1: [(10, 0.3), (11, 0.2)], 2: [(10, 0.1)]}
        items = [(1, 2), (2, 3), (1, 1)]  # 3 do produto 1 no total, 3 do produto 2
        required = aggregate_required(items, recipes)
        self.assertAlmostEqual(required[10], 0.3 * 3 + 0.1 * 3)
        self.assertAlmostEqual(required[11], 0.2 * 3)

    def test_float_noise_is_rounded(self):
        required = aggregate_required([(1, 3)], {1: [(10, 0.1)]})
        self.assertEqual(required[10], 0.3)  # sem 0.30000000000000004

    def test_product_without_recipe_consumes_nothing(self):
        self.assertEqual(aggregate_required([(99, 5)], {}), {})


class FindShortagesTests(unittest.TestCase):
    def test_reports_only_missing_ingredients(self):
        shortages = find_shortages(
            required={1: 5.0, 2: 1.0},
            available={1: 4.0, 2: 1.0},
            names={1: "Queijo", 2: "Farinha"},
        )
        self.assertEqual(len(shortages), 1)
        self.assertEqual(shortages[0]["ingredient_name"], "Queijo")
        self.assertEqual(shortages[0]["required"], 5.0)
        self.assertEqual(shortages[0]["available"], 4.0)

    def test_exact_stock_is_enough(self):
        self.assertEqual(find_shortages({1: 0.3}, {1: 0.1 * 3}, {1: "x"}), [])

    def test_unknown_ingredient_counts_as_zero(self):
        shortages = find_shortages({7: 1.0}, {}, {})
        self.assertEqual(shortages[0]["available"], 0.0)


if __name__ == "__main__":
    unittest.main()
