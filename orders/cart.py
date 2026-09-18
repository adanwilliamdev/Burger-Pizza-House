"""Carrinho armazenado na sessão do usuário — usado pela tela de novo pedido."""

SESSION_KEY = "order_cart"


class Cart:
    def __init__(self, request):
        self.session = request.session
        cart = self.session.get(SESSION_KEY)
        if cart is None:
            cart = []
            self.session[SESSION_KEY] = cart
        self.items = cart

    def add(self, product_id, quantity, notes="", half_flavors=None):
        self.items.append({
            "product_id": product_id,
            "quantity": quantity,
            "notes": notes,
            "half_flavors": half_flavors or [],
        })
        self.save()

    def remove(self, index):
        try:
            del self.items[index]
        except IndexError:
            pass
        self.save()

    def clear(self):
        self.items = []
        self.save()

    def save(self):
        self.session[SESSION_KEY] = self.items
        self.session.modified = True

    def __len__(self):
        return len(self.items)
