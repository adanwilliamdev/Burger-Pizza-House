from django import forms
from django.forms import inlineformset_factory

from .models import Ingredient, Product, ProductIngredient

INPUT_CLASSES = "input"


class IngredientForm(forms.ModelForm):
    class Meta:
        model = Ingredient
        fields = ["name", "unit", "current_stock", "min_stock", "cost_per_unit"]
        widgets = {
            "name": forms.TextInput(attrs={"class": INPUT_CLASSES}),
            "unit": forms.TextInput(attrs={"class": INPUT_CLASSES}),
            "current_stock": forms.NumberInput(attrs={"class": INPUT_CLASSES, "step": "0.01"}),
            "min_stock": forms.NumberInput(attrs={"class": INPUT_CLASSES, "step": "0.01"}),
            "cost_per_unit": forms.NumberInput(attrs={"class": INPUT_CLASSES, "step": "0.01"}),
        }

    def clean_current_stock(self):
        value = self.cleaned_data["current_stock"]
        if value < 0:
            raise forms.ValidationError("Estoque não pode ser negativo")
        return value

    def clean_min_stock(self):
        value = self.cleaned_data["min_stock"]
        if value < 0:
            raise forms.ValidationError("Estoque mínimo não pode ser negativo")
        return value

    def clean_cost_per_unit(self):
        value = self.cleaned_data["cost_per_unit"]
        if value < 0:
            raise forms.ValidationError("Custo não pode ser negativo")
        return value


class StockAdjustForm(forms.Form):
    OPERATION_CHOICES = [("add", "Adicionar"), ("remove", "Remover")]

    operation = forms.ChoiceField(choices=OPERATION_CHOICES, widget=forms.Select(attrs={"class": INPUT_CLASSES}))
    quantity = forms.FloatField(
        min_value=0.0001, widget=forms.NumberInput(attrs={"class": INPUT_CLASSES, "step": "0.01"})
    )


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = [
            "name", "description", "price", "cost", "category", "type",
            "is_active", "image", "preparation_time",
        ]
        widgets = {
            "name": forms.TextInput(attrs={"class": INPUT_CLASSES}),
            "description": forms.Textarea(attrs={"class": INPUT_CLASSES, "rows": 3}),
            "price": forms.NumberInput(attrs={"class": INPUT_CLASSES, "step": "0.01"}),
            "cost": forms.NumberInput(attrs={"class": INPUT_CLASSES, "step": "0.01"}),
            "category": forms.Select(attrs={"class": INPUT_CLASSES}),
            "type": forms.Select(attrs={"class": INPUT_CLASSES}),
            "image": forms.TextInput(attrs={"class": INPUT_CLASSES, "placeholder": "https://..."}),
            "preparation_time": forms.NumberInput(attrs={"class": INPUT_CLASSES}),
        }

    def clean_price(self):
        value = self.cleaned_data["price"]
        if value < 0:
            raise forms.ValidationError("Preço não pode ser negativo")
        return value


ProductIngredientFormSet = inlineformset_factory(
    Product,
    ProductIngredient,
    fields=["ingredient", "quantity", "unit"],
    extra=1,
    can_delete=True,
    widgets={
        "ingredient": forms.Select(attrs={"class": INPUT_CLASSES}),
        "quantity": forms.NumberInput(attrs={"class": INPUT_CLASSES, "step": "0.01"}),
        "unit": forms.TextInput(attrs={"class": INPUT_CLASSES}),
    },
)
