import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [form, setForm] = useState({ tenantSlug: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.login(form.tenantSlug, form.email, form.password),
    onSuccess: (res) => {
      const { accessToken, refreshToken, user } = res.data;
      login(user, accessToken, form.tenantSlug, refreshToken);
      navigate('/');
    },
    onError: () => {
      toast.error('Invalid credentials. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tenantSlug || !form.email || !form.password) {
      toast.error('Please fill in all fields.');
      return;
    }
    mutation.mutate();
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-cherry flex items-center justify-center relative mb-3">
            <div className="absolute inset-[9px] border-2 border-paper rounded-full" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Vikreta</h1>
          <p className="text-sm text-ink-soft mt-1">Billing & Inventory</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card">
          <div className="card-head">
            <h2 className="text-sm font-bold">Sign in to your account</h2>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div>
              <label htmlFor="tenantSlug" className="block text-xs font-medium text-ink-soft mb-1">
                Store / Tenant
              </label>
              <input
                id="tenantSlug"
                type="text"
                placeholder="e.g. demo"
                value={form.tenantSlug}
                onChange={set('tenantSlug')}
                className="input"
                autoComplete="organization"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-ink-soft mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                className="input"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-ink-soft mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  className="input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-xs text-teal-dark font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary w-full justify-center py-3"
            >
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-xs text-ink-soft">
              Demo: tenant <strong>demo</strong> · owner@demo.com · password123
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
