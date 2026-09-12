import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideDynamicIcon,
  LucidePlus as Plus,
  LucideX as X,
  LucideTrash2 as Trash2,
  LucideClipboardList as ClipboardList,
} from '@lucide/angular';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrdersService } from '../../core/services/orders.service';
import { ProductsService } from '../../core/services/products.service';
import { ToastService } from '../../core/services/toast.service';
import { Order, Product, StatusTone } from '../../core/models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  ORDER_STATUS_ICON,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_TONE,
  ORDER_STATUS_TRANSITIONS,
} from '../../shared/utils/order-status';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderForm {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  type: string;
  paymentMethod: string;
  discount: string;
  deliveryFee: string;
  note: string;
}

const EMPTY_ORDER_FORM: OrderForm = {
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  type: 'DELIVERY',
  paymentMethod: 'CASH',
  discount: '',
  deliveryFee: '',
  note: '',
};

const TYPE_OPTIONS = [
  { value: 'DELIVERY', label: 'Entrega' },
  { value: 'TAKEAWAY', label: 'Retirada' },
  { value: 'TABLE', label: 'Mesa' },
];

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'PIX', label: 'Pix' },
  { value: 'IFOOD', label: 'iFood' },
  { value: 'MEAL_TICKET', label: 'Vale-refeição' },
];

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, LucideDynamicIcon, EmptyStateComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders.component.html',
})
export class OrdersComponent {
  private ordersService = inject(OrdersService);
  private productsService = inject(ProductsService);
  private toast = inject(ToastService);

  readonly Plus = Plus;
  readonly X = X;
  readonly Trash2 = Trash2;
  readonly ClipboardList = ClipboardList;

  readonly statusLabel = ORDER_STATUS_LABEL;
  readonly statusTone = ORDER_STATUS_TONE;
  readonly statusIcon = ORDER_STATUS_ICON;
  readonly typeOptions = TYPE_OPTIONS;
  readonly paymentOptions = PAYMENT_OPTIONS;

  readonly pageSize = 20;

  readonly orders = signal<Order[]>([]);
  readonly totalOrders = signal(0);
  readonly page = signal(1);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalOrders() / this.pageSize)));
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly showModal = signal(false);
  readonly saving = signal(false);
  readonly orderForm = signal<OrderForm>({ ...EMPTY_ORDER_FORM });
  readonly cart = signal<CartItem[]>([]);
  readonly selectedProductId = signal('');

  readonly subtotal = computed(() => this.cart().reduce((sum, item) => sum + item.price * item.quantity, 0));
  readonly discountValue = computed(() => Number(this.orderForm().discount) || 0);
  readonly deliveryFeeValue = computed(() => Number(this.orderForm().deliveryFee) || 0);
  readonly orderTotal = computed(() => this.subtotal() - this.discountValue() + this.deliveryFeeValue());

  constructor() {
    this.fetchOrders();
    this.fetchProducts();
  }

  private async fetchOrders(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.ordersService.getPage(this.page(), this.pageSize);
      this.orders.set(result.items);
      this.totalOrders.set(result.total);
    } catch {
      this.toast.error('Erro ao carregar pedidos');
    } finally {
      this.loading.set(false);
    }
  }

  goToPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages());
    if (clamped === this.page()) return;
    this.page.set(clamped);
    this.fetchOrders();
  }

  private async fetchProducts(): Promise<void> {
    try {
      this.products.set(await this.productsService.getAll({ isActive: true }));
    } catch {
      this.toast.error('Erro ao carregar produtos');
    }
  }

  /** Opções do <select>: sempre inclui o status atual + só as transições que a API aceita. */
  statusOptionsFor(order: Order): { value: string; label: string }[] {
    const allowedNext = ORDER_STATUS_TRANSITIONS[order.status] || [];
    return ORDER_STATUS_OPTIONS.filter(
      (opt) => opt.value === order.status || allowedNext.includes(opt.value)
    );
  }

  /** Estados terminais (entregue/cancelado) não têm mais nenhuma transição possível. */
  isTerminalStatus(order: Order): boolean {
    return (ORDER_STATUS_TRANSITIONS[order.status] || []).length === 0;
  }

  async onStatusChange(order: Order, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value;
    const previousStatus = order.status;

    try {
      await this.ordersService.updateStatus(order.id, newStatus);
      this.toast.success('Status atualizado!');
      await this.fetchOrders();
    } catch {
      this.toast.error('Erro ao atualizar status');
      // A chamada falhou (ex: transição inválida, 409) — o <select> nativo já
      // exibe a opção que o usuário escolheu independente do Angular, então
      // sem isso ele ficaria mostrando um status que nunca foi de fato salvo.
      select.value = previousStatus;
    }
  }

  statusToneOf(status: string): StatusTone {
    return this.statusTone[status] || 'neutral';
  }

  updateOrderForm<K extends keyof OrderForm>(key: K, value: OrderForm[K]): void {
    this.orderForm.update((f) => ({ ...f, [key]: value }));
  }

  openCreateModal(): void {
    this.orderForm.set({ ...EMPTY_ORDER_FORM });
    this.cart.set([]);
    this.selectedProductId.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  addProductToCart(): void {
    const id = this.selectedProductId();
    if (!id) return;
    const product = this.products().find((p) => p.id === id);
    if (!product) return;

    this.cart.update((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    this.selectedProductId.set('');
  }

  onQuantityInput(productId: string, value: string): void {
    this.changeCartQuantity(productId, Number(value));
  }

  changeCartQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.cart.update((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    this.cart.update((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }

  removeFromCart(productId: string): void {
    this.cart.update((prev) => prev.filter((item) => item.productId !== productId));
  }

  async handleCreateOrder(): Promise<void> {
    if (this.cart().length === 0) {
      this.toast.error('Adicione ao menos um item ao pedido');
      return;
    }

    this.saving.set(true);
    const f = this.orderForm();
    try {
      await this.ordersService.create({
        customerName: f.customerName || undefined,
        customerPhone: f.customerPhone || undefined,
        customerAddress: f.customerAddress || undefined,
        type: f.type,
        paymentMethod: f.paymentMethod,
        discount: this.discountValue(),
        deliveryFee: this.deliveryFeeValue(),
        note: f.note || undefined,
        items: this.cart().map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      this.toast.success('Pedido criado!');
      this.closeModal();
      // Volta pra primeira página pra mostrar o pedido recém-criado
      // (a listagem é ordenada por mais recente primeiro).
      this.page.set(1);
      await this.fetchOrders();
    } catch {
      this.toast.error('Erro ao criar pedido');
    } finally {
      this.saving.set(false);
    }
  }

  formatDateTime(date: string): string {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  }
}
