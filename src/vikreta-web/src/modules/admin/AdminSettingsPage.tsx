import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Save, QrCode } from 'lucide-react';
import { adminApi } from '../../api/client';

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
    loyaltyEnabled: true,
    loyaltyPointsPerAmount: 100,
    loyaltyRedemptionRate: 1.0,
  });

  const [upiId, setUpiId] = useState(() => localStorage.getItem('store_upi_id') || 'democoffee@upi');
  const [upiName, setUpiName] = useState(() => localStorage.getItem('store_upi_name') || 'Demo Coffee');

  useEffect(() => {
    if (settings) setForm({ ...settings, defaultTaxRate: settings.defaultTaxRate * 100 });
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () => adminApi.updateSettings({ ...form, defaultTaxRate: form.defaultTaxRate / 100 }),
    onSuccess: () => {
      localStorage.setItem('store_upi_id', upiId.trim());
      localStorage.setItem('store_upi_name', upiName.trim());
      toast.success('Settings saved!');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Failed to save settings.'),
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Store Settings</h1>
          <p className="text-xs text-ink-soft">Configure taxes, receipts, and payment parameters</p>
        </div>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary" id="save-settings-btn">
          <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-4">
        {/* UPI & Payment Settings */}
        <div className="card">
          <div className="card-head flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <QrCode size={15} className="text-teal-dark" /> UPI & Digital Payments
            </h3>
            <span className="text-[11px] text-ink-soft">For Dynamic POS QR codes</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Store UPI VPA / ID *</label>
              <input
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                className="input font-mono text-sm"
                placeholder="e.g. yourstore@okaxis or 9876543210@paytm"
                id="settings-upi-id"
              />
              <p className="text-[11px] text-ink-soft mt-1">Customers scanning the POS QR code will pay directly to this UPI address.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Payee Business Name</label>
              <input
                value={upiName}
                onChange={e => setUpiName(e.target.value)}
                className="input text-sm"
                placeholder="e.g. Demo Coffee Store"
                id="settings-upi-name"
              />
            </div>
          </div>
        </div>

        {/* Tax & Currency */}
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

        {/* Receipt Branding */}
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

        {/* Customer Loyalty Program */}
        <div className="card">
          <div className="card-head flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              ⭐ Customer Loyalty Program
            </h3>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ink">
              <input
                type="checkbox"
                checked={form.loyaltyEnabled}
                onChange={e => setForm(f => ({ ...f, loyaltyEnabled: e.target.checked }))}
                className="rounded border-ink text-teal focus:ring-teal h-4 w-4"
                id="settings-loyalty-toggle"
              />
              {form.loyaltyEnabled ? <span className="text-teal-dark">Enabled</span> : <span className="text-ink-soft">Disabled</span>}
            </label>
          </div>
          <div className={`px-5 py-4 space-y-3 transition-opacity ${form.loyaltyEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <p className="text-xs text-ink-soft">
              Customers earn points on sales that can be redeemed as instant bill discounts directly on the POS counter.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Earning Rate (₹ spent per 1 point)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-ink-soft">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={form.loyaltyPointsPerAmount}
                    onChange={e => setForm(f => ({ ...f, loyaltyPointsPerAmount: parseFloat(e.target.value) || 100 }))}
                    className="input pl-6 font-mono text-sm"
                    placeholder="100"
                    id="settings-loyalty-earn-rate"
                  />
                </div>
                <p className="text-[11px] text-ink-soft mt-1">e.g. ₹100 spent = 1 Loyalty Point earned.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Redemption Value (₹ per 1 point)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-ink-soft">₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={form.loyaltyRedemptionRate}
                    onChange={e => setForm(f => ({ ...f, loyaltyRedemptionRate: parseFloat(e.target.value) || 1 }))}
                    className="input pl-6 font-mono text-sm"
                    placeholder="1.00"
                    id="settings-loyalty-redeem-rate"
                  />
                </div>
                <p className="text-[11px] text-ink-soft mt-1">e.g. 1 Loyalty Point = ₹1.00 discount.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
