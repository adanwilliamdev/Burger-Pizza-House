import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Product } from '../types';
import { Plus, Edit, Trash2, Search, X, Pizza } from 'lucide-react';
import toast from 'react-hot-toast';
import { SkeletonTableRows } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  cost: '',
  category: 'PIZZA',
  preparationTime: '15'
};

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      cost: String(product.cost ?? ''),
      category: product.category,
      preparationTime: String(product.preparationTime ?? 15)
    });
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      cost: form.cost ? Number(form.cost) : 0,
      category: form.category,
      preparationTime: Number(form.preparationTime) || 15
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success('Produto atualizado!');
      } else {
        await api.post('/products', payload);
        toast.success('Produto criado!');
      }
      setForm(emptyForm);
      setEditingProduct(null);
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      toast.error(editingProduct ? 'Erro ao atualizar produto' : 'Erro ao criar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Excluir o produto "${product.name}"? Essa ação não pode ser desfeita.`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Produto excluído!');
      fetchProducts();
    } catch (error) {
      toast.error('Erro ao excluir produto');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title">Produtos</h1>
          <p className="text-caption mt-1">Gerencie seu cardápio</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Table */}
      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header-cell">Produto</th>
                <th className="table-header-cell">Categoria</th>
                <th className="table-header-cell">Preço</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={5} cols={5} />
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Pizza}
                      title="Nenhum produto encontrado"
                      description={search ? 'Tente buscar por outro termo.' : 'Cadastre seu primeiro produto para começar.'}
                    />
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="table-row">
                    <td className="py-3 px-4">
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-caption">{product.description}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted">{product.category}</td>
                    <td className="py-3 px-4 font-semibold text-sm">
                      R$ {product.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={product.isActive ? 'badge-success' : 'badge-neutral'}>
                        {product.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(product)}
                          className="btn-icon hover:text-info hover:bg-info/10"
                          title="Editar produto"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          disabled={deletingId === product.id}
                          className="btn-icon hover:text-danger hover:bg-danger/10"
                          title="Excluir produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Produto */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-card-title text-lg">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingProduct(null); }}
                className="btn-icon"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="input-label">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Pizza Margherita"
                />
              </div>

              <div>
                <label className="input-label">Descrição</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                  placeholder="Molho de tomate, mussarela..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input-field"
                    placeholder="45.90"
                  />
                </div>
                <div>
                  <label className="input-label">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="input-field"
                    placeholder="15.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-field"
                  >
                    <option value="PIZZA">Pizza</option>
                    <option value="HAMBURGUER">Hambúrguer</option>
                    <option value="DRINK">Bebida</option>
                    <option value="DESSERT">Sobremesa</option>
                    <option value="SIDE">Acompanhamento</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Preparo (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.preparationTime}
                    onChange={(e) => setForm({ ...form, preparationTime: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingProduct(null); }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingProduct ? 'Salvar alterações' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
