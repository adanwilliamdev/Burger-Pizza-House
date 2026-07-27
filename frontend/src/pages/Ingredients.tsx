import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Ingredient } from '../types';
import { Plus, Edit, AlertTriangle, X, Package, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SkeletonTableRows } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

const emptyForm = {
  name: '',
  unit: 'g',
  minStock: '',
  costPerUnit: '',
  currentStock: ''
};

export const Ingredients: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const response = await api.get('/ingredients');
      setIngredients(response.data);
    } catch (error) {
      toast.error('Erro ao carregar ingredientes');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingIngredient(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setForm({
      name: ingredient.name,
      unit: ingredient.unit,
      minStock: String(ingredient.minStock ?? ''),
      costPerUnit: String(ingredient.costPerUnit ?? ''),
      currentStock: String(ingredient.currentStock ?? '')
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIngredient(null);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingIngredient) {
        await api.put(`/ingredients/${editingIngredient.id}`, {
          name: form.name,
          unit: form.unit,
          minStock: Number(form.minStock) || 0,
          costPerUnit: Number(form.costPerUnit) || 0
        });
        toast.success('Ingrediente atualizado!');
      } else {
        await api.post('/ingredients', {
          name: form.name,
          unit: form.unit,
          minStock: Number(form.minStock) || 0,
          costPerUnit: Number(form.costPerUnit) || 0,
          currentStock: Number(form.currentStock) || 0
        });
        toast.success('Ingrediente criado!');
      }
      closeModal();
      fetchIngredients();
    } catch (error) {
      toast.error(editingIngredient ? 'Erro ao atualizar ingrediente' : 'Erro ao criar ingrediente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title">Estoque</h1>
          <p className="text-caption mt-1">Gerencie seus ingredientes</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Ingrediente
        </button>
      </div>

      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header-cell">Ingrediente</th>
                <th className="table-header-cell">Estoque Atual</th>
                <th className="table-header-cell">Estoque Mínimo</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={5} cols={5} />
              ) : ingredients.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={Package} title="Nenhum ingrediente cadastrado" description="Cadastre seu primeiro ingrediente para começar a controlar o estoque." />
                  </td>
                </tr>
              ) : (
                ingredients.map((ingredient) => {
                  const isLow = ingredient.currentStock <= ingredient.minStock;
                  return (
                    <tr key={ingredient.id} className="table-row">
                      <td className="py-3 px-4 font-medium text-sm">{ingredient.name}</td>
                      <td className="py-3 px-4 text-sm">
                        {ingredient.currentStock} {ingredient.unit}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted">
                        {ingredient.minStock} {ingredient.unit}
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="badge-danger">
                            <AlertTriangle className="w-3 h-3" />
                            Estoque Baixo
                          </span>
                        ) : (
                          <span className="badge-success">
                            <CheckCircle2 className="w-3 h-3" />
                            OK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openEditModal(ingredient)}
                          className="btn-icon hover:text-info hover:bg-info/10"
                          title="Editar ingrediente"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-card-title text-lg">
                {editingIngredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}
              </h2>
              <button onClick={closeModal} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-4">
              <div>
                <label className="input-label">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Mussarela"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Unidade</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="input-field"
                  >
                    <option value="g">Gramas (g)</option>
                    <option value="kg">Quilos (kg)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="l">Litros (l)</option>
                    <option value="un">Unidade (un)</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Custo por unidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.costPerUnit}
                    onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
                    className="input-field"
                    placeholder="0.05"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {!editingIngredient && (
                  <div>
                    <label className="input-label">Estoque inicial</label>
                    <input
                      type="number"
                      min="0"
                      value={form.currentStock}
                      onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                )}
                <div>
                  <label className="input-label">Estoque mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>

              {editingIngredient && (
                <p className="text-caption">
                  Para ajustar a quantidade em estoque, use a movimentação de estoque (entrada/saída) em vez desta tela.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingIngredient ? 'Salvar alterações' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
