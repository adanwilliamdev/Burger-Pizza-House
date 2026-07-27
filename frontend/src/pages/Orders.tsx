import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Order, Product } from '../types';
import { Clock, CheckCircle, XCircle, Truck, Package, Plus, X, Trash2, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

const emptyOrderForm = {
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  type: 'DELIVERY',
  paymentMethod: 'CASH',
  discount: '',
  deliveryFee: '',
  note: ''
};

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', { params: { isActive: true } });
      setProducts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success('Status atualizado!');
      fetchOrders();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const statusTone: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    PREPARING: 'info',
    READY: 'success',
    DELIVERING: 'warning',
    DELIVERED: 'success',
    CANCELLED: 'danger'
  };

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendente',
    CONFIRMED: 'Confirmado',
    PREPARING: 'Preparando',
    READY: 'Pronto',
    DELIVERING: 'Entregando',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado'
  };

  const statusIcons = {
    PENDING: Clock,
    CONFIRMED: CheckCircle,
    PREPARING: Package,
    READY: CheckCircle,
    DELIVERING: Truck,
    DELIVERED: CheckCircle,
    CANCELLED: XCircle
  };

  const openCreateModal = () => {
    setOrderForm(emptyOrderForm);
    setCart([]);
    setSelectedProductId('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const addProductToCart = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    setSelectedProductId('');
  };

  const changeCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.productId !== productId));
      return;
    }
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, quantity } : item));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountValue = Number(orderForm.discount) || 0;
  const deliveryFeeValue = Number(orderForm.deliveryFee) || 0;
  const orderTotal = subtotal - discountValue + deliveryFeeValue;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error('Adicione ao menos um item ao pedido');
      return;
    }

    setSaving(true);
    try {
      await api.post('/orders', {
        customerName: orderForm.customerName || undefined,
        customerPhone: orderForm.customerPhone || undefined,
        customerAddress: orderForm.customerAddress || undefined,
        type: orderForm.type,
        paymentMethod: orderForm.paymentMethod,
        discount: discountValue,
        deliveryFee: deliveryFeeValue,
        note: orderForm.note || undefined,
        items: cart.map(item => ({ productId: item.productId, quantity: item.quantity }))
      });
      toast.success('Pedido criado!');
      closeModal();
      fetchOrders();
    } catch (error) {
      toast.error('Erro ao criar pedido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title">Pedidos</h1>
          <p className="text-caption mt-1">Gerencie todos os pedidos</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Pedido
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card">
                <div className="flex items-center gap-4">
                  <div className="skeleton w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="skeleton h-4 w-40" />
                    <div className="skeleton h-3 w-56" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : orders.length === 0 ? (
          <div className="table-shell">
            <EmptyState icon={ClipboardList} title="Nenhum pedido encontrado" description="Crie o primeiro pedido para começar a acompanhar suas vendas." />
          </div>
        ) : (
          orders.map((order) => {
            return (
              <div key={order.id} className="card card-hover">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">#{order.number}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {order.customerName || 'Cliente não identificado'}
                      </p>
                      <p className="text-caption">
                        {order.type} • {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <StatusBadge label={statusLabel[order.status] || order.status} tone={statusTone[order.status] || 'neutral'} icon={statusIcons[order.status as keyof typeof statusIcons] || Clock} />
                    <span className="font-bold text-lg text-primary">
                      R$ {order.total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="text-sm border border-line dark:border-gray-700 dark:bg-gray-800 rounded-xl px-3 py-1.5
                                 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200"
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="CONFIRMED">Confirmado</option>
                      <option value="PREPARING">Preparando</option>
                      <option value="READY">Pronto</option>
                      <option value="DELIVERING">Entregando</option>
                      <option value="DELIVERED">Entregue</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-line dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span key={item.id} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm">
                        {item.quantity}x {item.product.name}
                      </span>
                    ))}
                  </div>
                  {order.note && (
                    <p className="mt-2 text-caption">📝 {order.note}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-card-title text-lg">Novo Pedido</h2>
              <button onClick={closeModal} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-5">
              {/* Itens */}
              <div>
                <label className="input-label">Itens do pedido</label>
                <div className="flex gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="input-field flex-1"
                  >
                    <option value="">Selecione um produto...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} — R$ {product.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addProductToCart}
                    disabled={!selectedProductId}
                    className="btn-primary px-4 disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {cart.length === 0 ? (
                    <p className="text-caption">Nenhum item adicionado ainda.</p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between bg-surface dark:bg-gray-900 rounded-xl px-3 py-2">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-caption">R$ {item.price.toFixed(2)} / un.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => changeCartQuantity(item.productId, Number(e.target.value))}
                            className="w-16 text-center border border-line dark:border-gray-700 dark:bg-gray-800 rounded-xl py-1"
                          />
                          <span className="font-semibold text-sm w-20 text-right">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="btn-icon hover:text-danger hover:bg-danger/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Cliente</label>
                  <input
                    type="text"
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                    className="input-field"
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <label className="input-label">Telefone</label>
                  <input
                    type="text"
                    value={orderForm.customerPhone}
                    onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                    className="input-field"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {orderForm.type === 'DELIVERY' && (
                <div>
                  <label className="input-label">Endereço de entrega</label>
                  <input
                    type="text"
                    value={orderForm.customerAddress}
                    onChange={(e) => setOrderForm({ ...orderForm, customerAddress: e.target.value })}
                    className="input-field"
                    placeholder="Rua, número, bairro"
                  />
                </div>
              )}

              {/* Tipo e pagamento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Tipo de pedido</label>
                  <select
                    value={orderForm.type}
                    onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="DELIVERY">Entrega</option>
                    <option value="TAKEAWAY">Retirada</option>
                    <option value="TABLE">Mesa</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Forma de pagamento</label>
                  <select
                    value={orderForm.paymentMethod}
                    onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}
                    className="input-field"
                  >
                    <option value="CASH">Dinheiro</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                    <option value="DEBIT_CARD">Cartão de Débito</option>
                    <option value="PIX">Pix</option>
                    <option value="IFOOD">iFood</option>
                    <option value="MEAL_TICKET">Vale-refeição</option>
                  </select>
                </div>
              </div>

              {/* Desconto e taxa */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={orderForm.discount}
                    onChange={(e) => setOrderForm({ ...orderForm, discount: e.target.value })}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="input-label">Taxa de entrega (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={orderForm.deliveryFee}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryFee: e.target.value })}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Observação</label>
                <input
                  type="text"
                  value={orderForm.note}
                  onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })}
                  className="input-field"
                  placeholder="Sem cebola, troco para R$ 100..."
                />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-surface dark:bg-gray-900 rounded-xl px-4 py-3">
                <span className="text-sm text-muted">Total do pedido</span>
                <span className="text-xl font-bold text-primary">R$ {orderTotal.toFixed(2)}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || cart.length === 0}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Criar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
