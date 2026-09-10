import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/client';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [tenantSlug, setTenantSlug] = useState('demo');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const requestMutation = useMutation({
    mutationFn: () => authApi.forgotPassword(tenantSlug, email),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Reset instructions sent!');
      if (res.data.resetToken) {
        setToken(res.data.resetToken);
        setStep('reset');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to request password reset.');
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => authApi.resetPassword(token, newPassword),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Password successfully updated!');
      navigate('/login');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to reset password.');
    },
  });

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSlug || !email) {
      toast.error('Please enter your store slug and email.');
      return;
    }
    requestMutation.mutate();
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword) {
      toast.error('Please provide the reset token and new password.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    resetMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-cherry flex items-center justify-center relative mb-3">
            <div className="absolute inset-[9px] border-2 border-paper rounded-full" />
            <KeyRound size={18} className="text-paper" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Vikreta</h1>
          <p className="text-sm text-ink-soft mt-1">Account Recovery</p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-head flex items-center justify-between">
            <h2 className="text-sm font-bold">
              {step === 'request' ? 'Reset your password' : 'Enter new password'}
            </h2>
            <Link
              to="/login"
              className="text-xs text-ink-soft hover:text-ink flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft size={12} /> Sign in
            </Link>
          </div>

          <div className="px-5 py-5">
            {step === 'request' ? (
              <form onSubmit={handleRequest} className="space-y-4">
                <p className="text-xs text-ink-soft leading-relaxed">
                  Enter your store identifier and account email. We will generate a secure verification token for you.
                </p>

                <div>
                  <label htmlFor="tenantSlug" className="block text-xs font-medium text-ink-soft mb-1">
                    Store / Tenant
                  </label>
                  <input
                    id="tenantSlug"
                    type="text"
                    placeholder="e.g. demo"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    className="input"
                    autoComplete="organization"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-ink-soft mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="btn-primary w-full justify-center py-3"
                >
                  {requestMutation.isPending ? 'Validating…' : 'Generate Reset Token'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="flex items-center gap-2 p-2.5 bg-teal/10 border border-teal/30 rounded-lg text-teal-dark text-xs font-medium">
                  <CheckCircle2 size={16} className="shrink-0 text-teal" />
                  <span>Security token generated! Set your new password below.</span>
                </div>

                <div>
                  <label htmlFor="resetToken" className="block text-xs font-medium text-ink-soft mb-1">
                    Verification Token
                  </label>
                  <input
                    id="resetToken"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="input text-xs font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-xs font-medium text-ink-soft mb-1">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetMutation.isPending}
                  className="btn-primary w-full justify-center py-3"
                >
                  {resetMutation.isPending ? 'Updating…' : 'Confirm New Password'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="w-full text-center text-xs text-ink-soft hover:text-ink font-medium mt-1"
                >
                  Start over
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
