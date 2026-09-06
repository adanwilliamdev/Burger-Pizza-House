import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideDynamicIcon,
  LucidePlus as Plus,
  LucideEdit as Edit,
  LucideTrash2 as Trash2,
  LucideSearch as Search,
  LucideX as X,
  LucidePizza as Pizza,
} from '@lucide/angular';
import { ProductsService } from '../../core/services/products.service';
import { ToastService } from '../../core/services/toast.service';
import { Product } from '../../core/models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonTableRowsComponent } from '../../shared/components/skeleton/skeleton.component';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  cost: string;
  category: string;
  preparationTime: string;
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  price: '',
  cost: '',
  category: 'PIZZA',
  preparationTime: '15',
};

const CATEGORY_OPTIONS = [
  { value: 'PIZZA', label: 'Pizza' },
  { value: 'HAMBURGUER', label: 'Hambúrguer' },
  { value: 'DRINK', label: 'Bebida' },
  { value: 'DESSERT', label: 'Sobremesa' },
  { value: 'SIDE', label: 'Acompanhamento' },
];

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [FormsModule, LucideDynamicIcon, EmptyStateComponent, SkeletonTableRowsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.component.html',
})
export class ProductsComponent {
  private productsService = inject(ProductsService);
  private toast = inject(ToastService);

  readonly Plus = Plus;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly Search = Search;
  readonly X = X;
  readonly Pizza = Pizza;
  readonly categoryOptions = CATEGORY_OPTIONS;

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly showModal = signal(false);
  readonly saving = signal(false);
  readonly form = signal<ProductForm>({ ...EMPTY_FORM });
  readonly editingProduct = signal<Product | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly filteredProducts = computed(() =>
    this.products().filter((p) => p.name.toLowerCase().includes(this.search().toLowerCase()))
  );

  constructor() {
    this.fetchProducts();
  }

  private async fetchProducts(): Promise<void> {
    this.loading.set(true);
    try {
      this.products.set(await this.productsService.getAll());
    } catch {
      this.toast.error('Erro ao carregar produtos');
    } finally {
      this.loading.set(false);
    }
  }

  updateForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  openCreateModal(): void {
    this.editingProduct.set(null);
    this.form.set({ ...EMPTY_FORM });
    this.showModal.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.form.set({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      cost: String(product.cost ?? ''),
      category: product.category,
      preparationTime: String(product.preparationTime ?? 15),
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
  }

  async handleSave(): Promise<void> {
    this.saving.set(true);
    const f = this.form();
    const payload = {
      name: f.name,
      description: f.description,
      price: Number(f.price),
      cost: f.cost ? Number(f.cost) : 0,
      category: f.category,
      preparationTime: Number(f.preparationTime) || 15,
    };

    const editing = this.editingProduct();
    try {
      if (editing) {
        await this.productsService.update(editing.id, payload);
        this.toast.success('Produto atualizado!');
      } else {
        await this.productsService.create(payload);
        this.toast.success('Produto criado!');
      }
      this.closeModal();
      await this.fetchProducts();
    } catch {
      this.toast.error(editing ? 'Erro ao atualizar produto' : 'Erro ao criar produto');
    } finally {
      this.saving.set(false);
    }
  }

  async handleDelete(product: Product): Promise<void> {
    if (!window.confirm(`Excluir o produto "${product.name}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    this.deletingId.set(product.id);
    try {
      await this.productsService.delete(product.id);
      this.toast.success('Produto excluído!');
      await this.fetchProducts();
    } catch {
      this.toast.error('Erro ao excluir produto');
    } finally {
      this.deletingId.set(null);
    }
  }
}
