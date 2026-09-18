from django import forms

from .models import Order

INPUT_CLASSES = "input"


class AddCartItemForm(forms.Form):
    product_id = forms.IntegerField(widget=forms.HiddenInput())
    quantity = forms.IntegerField(
        min_value=1, initial=1, widget=forms.NumberInput(attrs={"class": "input w-20"})
    )
    notes = forms.CharField(required=False, widget=forms.TextInput(attrs={"class": INPUT_CLASSES, "placeholder": "Observações (opcional)"}))
    half_flavors = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            "class": INPUT_CLASSES,
            "placeholder": "Sabores da meia pizza, separados por vírgula (opcional)",
        }),
    )


class CheckoutForm(forms.Form):
    customer_name = forms.CharField(required=False, label="Cliente", widget=forms.TextInput(attrs={"class": INPUT_CLASSES}))
    customer_phone = forms.CharField(required=False, label="Telefone", widget=forms.TextInput(attrs={"class": INPUT_CLASSES}))
    customer_address = forms.CharField(required=False, label="Endereço", widget=forms.TextInput(attrs={"class": INPUT_CLASSES}))
    type = forms.ChoiceField(label="Tipo", choices=Order.OrderType.choices, widget=forms.Select(attrs={"class": INPUT_CLASSES}))
    payment_method = forms.ChoiceField(
        label="Forma de pagamento", choices=Order.PaymentMethod.choices, widget=forms.Select(attrs={"class": INPUT_CLASSES})
    )
    discount = forms.FloatField(
        required=False, min_value=0, initial=0, label="Desconto (R$)",
        widget=forms.NumberInput(attrs={"class": INPUT_CLASSES, "step": "0.01"}),
    )
    delivery_fee = forms.FloatField(
        required=False, min_value=0, initial=0, label="Taxa de entrega (R$)",
        widget=forms.NumberInput(attrs={"class": INPUT_CLASSES, "step": "0.01"}),
    )
    note = forms.CharField(required=False, label="Observações", widget=forms.Textarea(attrs={"class": INPUT_CLASSES, "rows": 2}))


class OrderStatusForm(forms.Form):
    status = forms.ChoiceField(choices=Order.Status.choices, widget=forms.Select(attrs={"class": INPUT_CLASSES}))
