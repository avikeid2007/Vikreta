import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Save, Trash2, ChevronLeft, Barcode } from 'lucide-react';
import { productsApi, categoriesApi } from '../../api/client';
import { MoneyInput } from '../../components/FormControls';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { BarcodeGeneratorModal } from '../../components/BarcodeGeneratorModal';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const { data: productData } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id!),
    enabled: !isNew && Boolean(id) && id !== 'new',
  });
  const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() });

  const product = productData?.data;
  const categories = catData?.data ?? [];

  const [form, setForm] = useState(() => ({
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? '',
    unitOfMeasure: product?.unitOfMeasure ?? 'each',
    defaultPrice: product?.defaultPrice ?? 0,
    defaultCost: product?.defaultCost ?? 0,
    taxRate: (product?.taxRate ?? 0.05) * 100,
    tracksInventory: product?.tracksInventory ?? true,
    isActive: product?.isActive ?? true,
  }));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);

  React.useEffect(() => {
    if (product) {
      setForm({
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId ?? '',
        unitOfMeasure: product.unitOfMeasure,
        defaultPrice: product.defaultPrice,
        defaultCost: product.defaultCost,
        taxRate: product.taxRate * 100,
        tracksInventory: product.tracksInventory,
        isActive: product.isActive,
      });
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, taxRate: form.taxRate / 100, categoryId: form.categoryId || null };
      return isNew ? productsApi.create(payload) : productsApi.update(id!, payload);
    },
    onSuccess: () => {
      toast.success(isNew ? 'Product created!' : 'Product updated!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to save product.';
      toast.error(msg);
    },
  });

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!form.sku.trim()) {
      toast.error('SKU is required');
      return;
    }
    saveMutation.mutate();
  };

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.delete(id!),
    onSuccess: () => {
      toast.success('Product deleted.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  return (
    <div className="p-6 max-w-3xl">
      <button onClick={() => navigate('/products')} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink mb-4" id="back-to-products-btn">
        <ChevronLeft size={14} /> Back to Products
      </button>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">{isNew ? 'New Product' : 'Edit Product'}</h1>
          {!isNew && <p className="text-sm text-ink-soft mt-0.5 font-mono">#{product?.sku}</p>}
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <>
              <button
                type="button"
                onClick={() => setBarcodeOpen(true)}
                className="btn-ghost text-sm gap-1.5"
                id="print-barcode-btn"
              >
                <Barcode size={15} /> Print Labels
              </button>
              <button onClick={() => setDeleteOpen(true)} className="btn-danger" id="delete-product-btn">
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary" id="save-product-btn">
            <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left col */}
        <div className="card">
          <div className="card-head"><h3 className="text-sm font-bold">Basic Info</h3></div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: 'Product Name *', field: 'name', type: 'text', placeholder: 'e.g. Espresso Beans 1kg' },
              { label: 'SKU *', field: 'sku', type: 'text', placeholder: 'e.g. RET-001' },
              { label: 'Barcode', field: 'barcode', type: 'text', placeholder: 'Scan or type barcode' },
              { label: 'Unit of Measure', field: 'unitOfMeasure', type: 'text', placeholder: 'each, kg, box…' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-ink-soft mb-1">{label}</label>
                <input type={type} value={(form as any)[field]} onChange={set(field)} placeholder={placeholder} className="input" id={`product-${field}`} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Category</label>
              <select value={form.categoryId} onChange={set('categoryId')} className="input" id="product-category">
                <option value="">No category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Description</label>
              <textarea value={form.description} onChange={set('description')} rows={3} className="input resize-none" id="product-description" />
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-head"><h3 className="text-sm font-bold">Pricing & Tax</h3></div>
            <div className="px-5 py-4 space-y-3">
              <MoneyInput label="Selling Price *" id="product-price" value={form.defaultPrice} onChange={v => setForm(f => ({ ...f, defaultPrice: v }))} />
              <MoneyInput label="Cost Price" id="product-cost" value={form.defaultCost} onChange={v => setForm(f => ({ ...f, defaultCost: v }))} />
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Tax Rate (%)</label>
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={form.taxRate}
                  onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
                  className="input font-mono"
                  id="product-tax"
                />
                <p className="text-xs text-ink-soft mt-1">
                  Tax on ₹100 → ₹{(form.taxRate).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3 className="text-sm font-bold">Settings</h3></div>
            <div className="px-5 py-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tracksInventory}
                  onChange={set('tracksInventory')}
                  className="w-4 h-4 accent-teal"
                  id="product-tracks-inventory"
                />
                <div>
                  <p className="text-sm font-medium">Track inventory</p>
                  <p className="text-xs text-ink-soft">Deduct stock on each sale</p>
                </div>
              </label>
              {!isNew && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={set('isActive')}
                    className="w-4 h-4 accent-teal"
                    id="product-is-active"
                  />
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-ink-soft">Inactive products won't appear in POS</p>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${product?.name}"? This will mark it as inactive.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { deleteMutation.mutate(); setDeleteOpen(false); }}
        onCancel={() => setDeleteOpen(false)}
      />

      {barcodeOpen && product && (
        <BarcodeGeneratorModal
          product={{
            name: form.name || product.name,
            sku: form.sku || product.sku,
            barcode: form.barcode || product.barcode,
            defaultPrice: form.defaultPrice || product.defaultPrice,
          }}
          onClose={() => setBarcodeOpen(false)}
        />
      )}
    </div>
  );
};
