import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { categoriesApi } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const CategoriesPage: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() });
  const categories = data?.data ?? [];

  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', colorHex: '#1D7874', parentCategoryId: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, parentCategoryId: form.parentCategoryId || null };
      return editing
        ? categoriesApi.update(editing.id, payload)
        : categoriesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Category updated!' : 'Category created!');
      qc.invalidateQueries({ queryKey: ['categories'] });
      setEditing(null);
      setForm({ name: '', colorHex: '#1D7874', parentCategoryId: '' });
    },
    onError: () => toast.error('Failed to save category.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => { toast.success('Category deleted.'); qc.invalidateQueries({ queryKey: ['categories'] }); setDeleteId(null); },
  });

  const startEdit = (cat: any) => {
    setEditing(cat);
    setForm({ name: cat.name, colorHex: cat.colorHex, parentCategoryId: cat.parentCategoryId ?? '' });
  };

  const PRESETS = ['#1D7874', '#E8A33D', '#C8443C', '#6B4E71', '#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Categories</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Category List */}
        <div className="card">
          <div className="card-head"><h3 className="text-sm font-bold">All Categories ({categories.length})</h3></div>
          <div>
            {isLoading ? (
              <div className="p-4 text-center text-sm text-ink-soft">Loading…</div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-soft">No categories yet.</div>
            ) : (
              categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between px-4 py-3 border-b border-paper-alt last:border-b-0 hover:bg-paper group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border-2 border-ink flex-shrink-0" style={{ backgroundColor: cat.colorHex }} />
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      {cat.parentCategoryName && (
                        <p className="text-[11px] text-ink-soft">{cat.parentCategoryName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(cat)} className="btn-ghost p-1.5 text-ink-soft hover:text-ink">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteId(cat.id)} className="btn-ghost p-1.5 text-ink-soft hover:text-cherry">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <div className="card-head">
            <h3 className="text-sm font-bold">{editing ? `Edit: ${editing.name}` : 'New Category'}</h3>
            {editing && (
              <button onClick={() => { setEditing(null); setForm({ name: '', colorHex: '#1D7874', parentCategoryId: '' }); }} className="text-xs text-ink-soft hover:text-ink">
                Cancel
              </button>
            )}
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Drinks" className="input" id="cat-name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-2">Colour</label>
              <div className="flex gap-2 flex-wrap">
                {PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, colorHex: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.colorHex === c ? 'border-ink scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input type="color" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))} className="w-7 h-7 rounded cursor-pointer border-2 border-line" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Parent category (optional)</label>
              <select value={form.parentCategoryId} onChange={e => setForm(f => ({ ...f, parentCategoryId: e.target.value }))} className="input" id="cat-parent">
                <option value="">Top-level</option>
                {categories.filter((c: any) => c.id !== editing?.id).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} className="btn-primary w-full justify-center" id="save-category-btn">
              <Plus size={14} />
              {saveMutation.isPending ? 'Saving…' : editing ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Category"
        message="Are you sure? Products in this category will be uncategorised."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteMutation.mutate(deleteId!)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
