import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Save } from 'lucide-react';
import { adminApi } from '../../api/client';
import { MoneyInput } from '../../components/FormControls';

export const AdminSettingsPage: React.FC = () => {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => adminApi.getSettings() });
  const settings = data?.data;

  const [form, setForm] = useState({
    defaultTaxRate: 0,
    currencyCode: 'INR',
    receiptHeader: '',
    receiptFooter: 'Thank you!',
    logoUrl: '',
  });

  useEffect(() => {
    if (settings) setForm({ ...settings, defaultTaxRate: settings.defaultTaxRate * 100 });
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () => adminApi.updateSettings({ ...form, defaultTaxRate: form.defaultTaxRate / 100 }),
    onSuccess: () => { toast.success('Settings saved!'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => toast.error('Failed to save settings.'),
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Tenant Settings</h1>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary" id="save-settings-btn">
          <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="card">
          <div className="card-head"><h3 className="text-sm font-bold">Tax & Currency</h3></div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Default Tax Rate (%)</label>
              <input type="number" step="0.1" value={form.defaultTaxRate} onChange={e => setForm(f => ({ ...f, defaultTaxRate: parseFloat(e.target.value) || 0 }))} className="input font-mono" id="settings-tax" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Currency Code</label>
              <input value={form.currencyCode} onChange={set('currencyCode')} className="input font-mono" placeholder="INR" id="settings-currency" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3 className="text-sm font-bold">Receipt Branding</h3></div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: 'Receipt Header (store name, address)', field: 'receiptHeader', id: 'settings-receipt-header' },
              { label: 'Receipt Footer', field: 'receiptFooter', id: 'settings-receipt-footer' },
              { label: 'Logo URL', field: 'logoUrl', id: 'settings-logo' },
            ].map(({ label, field, id }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-ink-soft mb-1">{label}</label>
                <input value={(form as any)[field]} onChange={set(field)} className="input" id={id} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
