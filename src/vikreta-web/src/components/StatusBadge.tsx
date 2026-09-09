import React from 'react';

type StatusKey = 'paid' | 'void' | 'partial' | 'partiallypaid' | 'draft' | 'pending' | 'received' | 'partiallyreceived' | 'cancelled' | 'ordered' | 'low' | 'ok' | 'out' | 'intransit' | 'owner' | 'manager' | 'cashier';

const STATUS_MAP: Record<StatusKey, { label: string; className: string }> = {
  paid:              { label: 'PAID',       className: 'badge-paid' },
  void:              { label: 'VOID',       className: 'badge-void' },
  partial:           { label: 'PARTIAL',    className: 'badge-partial' },
  partiallypaid:     { label: 'PARTIAL',    className: 'badge-partial' },
  draft:             { label: 'DRAFT',      className: 'badge-draft' },
  pending:           { label: 'PENDING',    className: 'badge-pending' },
  ordered:           { label: 'ORDERED',    className: 'badge-pending' },
  received:          { label: 'RECEIVED',   className: 'badge-received' },
  partiallyreceived: { label: 'PARTIAL',    className: 'badge-partial' },
  cancelled:         { label: 'CANCELLED',  className: 'badge-void' },
  intransit:         { label: 'IN TRANSIT', className: 'badge-pending' },
  low:               { label: 'LOW',        className: 'badge-low' },
  ok:                { label: 'OK',         className: 'badge-ok' },
  out:               { label: 'OUT',        className: 'badge-out' },
  owner:             { label: 'OWNER',      className: 'badge-teal' },
  manager:           { label: 'MANAGER',    className: 'badge-pending' },
  cashier:           { label: 'CASHIER',    className: 'badge-draft' },
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const key = status.toLowerCase().replace(' ', '') as StatusKey;
  const config = STATUS_MAP[key] ?? { label: status.toUpperCase(), className: 'badge-draft' };
  return <span className={config.className}>{config.label}</span>;
};
