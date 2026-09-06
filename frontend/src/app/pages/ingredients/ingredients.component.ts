import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideDynamicIcon,
  LucidePlus as Plus,
  LucideEdit as Edit,
  LucideAlertTriangle as AlertTriangle,
  LucideX as X,
  LucidePackage as Package,
  LucideCheckCircle2 as CheckCircle2,
} from '@lucide/angular';
import { IngredientsService } from '../../core/services/ingredients.service';
import { ToastService } from '../../core/services/toast.service';
import { Ingredient } from '../../core/models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonTableRowsComponent } from '../../shared/components/skeleton/skeleton.component';

interface IngredientForm {
  name: string;
  unit: string;
  minStock: string;
  costPerUnit: string;
  currentStock: string;
}

const EMPTY_FORM: IngredientForm = {
  name: '',
  unit: 'g',
  minStock: '',
  costPerUnit: '',
  currentStock: '',
};

const UNIT_OPTIONS = [
  { value: 'g', label: 'Gramas (g)' },
  { value: 'kg', label: 'Quilos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'un', label: 'Unidade (un)' },
];

@Component({
  selector: 'app-ingredients',
  standalone: true,
  imports: [FormsModule, LucideDynamicIcon, EmptyStateComponent, SkeletonTableRowsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ingredients.component.html',
})
export class IngredientsComponent {
  private ingredientsService = inject(IngredientsService);
  private toast = inject(ToastService);

  readonly Plus = Plus;
  readonly Edit = Edit;
  readonly AlertTriangle = AlertTriangle;
  readonly X = X;
  readonly Package = Package;
  readonly CheckCircle2 = CheckCircle2;
  readonly unitOptions = UNIT_OPTIONS;

  readonly ingredients = signal<Ingredient[]>([]);
  readonly loading = signal(true);
  readonly showModal = signal(false);
  readonly saving = signal(false);
  readonly form = signal<IngredientForm>({ ...EMPTY_FORM });
  readonly editingIngredient = signal<Ingredient | null>(null);

  constructor() {
    this.fetchIngredients();
  }

  private async fetchIngredients(): Promise<void> {
    this.loading.set(true);
    try {
      this.ingredients.set(await this.ingredientsService.getAll());
    } catch {
      this.toast.error('Erro ao carregar ingredientes');
    } finally {
      this.loading.set(false);
    }
  }

  updateForm<K extends keyof IngredientForm>(key: K, value: IngredientForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  isLow(ingredient: Ingredient): boolean {
    return ingredient.currentStock <= ingredient.minStock;
  }

  openCreateModal(): void {
    this.editingIngredient.set(null);
    this.form.set({ ...EMPTY_FORM });
    this.showModal.set(true);
  }

  openEditModal(ingredient: Ingredient): void {
    this.editingIngredient.set(ingredient);
    this.form.set({
      name: ingredient.name,
      unit: ingredient.unit,
      minStock: String(ingredient.minStock ?? ''),
      costPerUnit: String(ingredient.costPerUnit ?? ''),
      currentStock: String(ingredient.currentStock ?? ''),
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingIngredient.set(null);
  }

  async handleSave(): Promise<void> {
    this.saving.set(true);
    const f = this.form();
    const editing = this.editingIngredient();

    try {
      if (editing) {
        await this.ingredientsService.update(editing.id, {
          name: f.name,
          unit: f.unit,
          minStock: Number(f.minStock) || 0,
          costPerUnit: Number(f.costPerUnit) || 0,
        });
        this.toast.success('Ingrediente atualizado!');
      } else {
        await this.ingredientsService.create({
          name: f.name,
          unit: f.unit,
          minStock: Number(f.minStock) || 0,
          costPerUnit: Number(f.costPerUnit) || 0,
          currentStock: Number(f.currentStock) || 0,
        });
        this.toast.success('Ingrediente criado!');
      }
      this.closeModal();
      await this.fetchIngredients();
    } catch {
      this.toast.error(editing ? 'Erro ao atualizar ingrediente' : 'Erro ao criar ingrediente');
    } finally {
      this.saving.set(false);
    }
  }
}
