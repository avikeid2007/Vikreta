import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  BarChart2,
  Users,
  Truck,
  FileText,
  Tags,
  SlidersHorizontal,
  Clock,
  ArrowRight,
  X,
  Settings,
  Zap,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'POS Hotkey';
  shortcut?: string;
  icon: React.ElementType;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-pos',
      title: 'POS Billing Counter',
      category: 'Navigation',
      shortcut: 'Alt + 1',
      icon: ShoppingCart,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'nav-products',
      title: 'Products Catalog',
      category: 'Navigation',
      shortcut: 'Alt + 2',
      icon: Package,
      action: () => { navigate('/products'); onClose(); },
    },
    {
      id: 'nav-stock',
      title: 'Stock Levels & Inventory',
      category: 'Navigation',
      shortcut: 'Alt + 3',
      icon: Boxes,
      action: () => { navigate('/inventory'); onClose(); },
    },
    {
      id: 'nav-invoices',
      title: 'Invoices & Billing History',
      category: 'Navigation',
      shortcut: 'Alt + 4',
      icon: Receipt,
      action: () => { navigate('/invoices'); onClose(); },
    },
    {
      id: 'nav-reports-sales',
      title: 'Sales & Revenue Reports',
      category: 'Navigation',
      shortcut: 'Alt + 5',
      icon: BarChart2,
      action: () => { navigate('/reports/sales'); onClose(); },
    },
    {
      id: 'nav-customers',
      title: 'Customers & Loyalty CRM',
      category: 'Navigation',
      icon: Users,
      action: () => { navigate('/customers'); onClose(); },
    },
    {
      id: 'nav-suppliers',
      title: 'Suppliers Directory',
      category: 'Navigation',
      icon: Truck,
      action: () => { navigate('/suppliers'); onClose(); },
    },
    {
      id: 'nav-po',
      title: 'Purchase Orders',
      category: 'Navigation',
      icon: FileText,
      action: () => { navigate('/purchase-orders'); onClose(); },
    },
    {
      id: 'nav-categories',
      title: 'Product Categories',
      category: 'Navigation',
      icon: Tags,
      action: () => { navigate('/categories'); onClose(); },
    },
    {
      id: 'nav-transfers',
      title: 'Stock Transfers',
      category: 'Navigation',
      icon: Boxes,
      action: () => { navigate('/inventory/transfers'); onClose(); },
    },
    {
      id: 'nav-stock-val',
      title: 'Stock Valuation Report',
      category: 'Navigation',
      icon: DollarSign,
      action: () => { navigate('/reports/stock-valuation'); onClose(); },
    },
    {
      id: 'nav-top-prod',
      title: 'Top Selling Products',
      category: 'Navigation',
      icon: TrendingUp,
      action: () => { navigate('/reports/top-products'); onClose(); },
    },
    {
      id: 'nav-settings',
      title: 'Store Settings & Loyalty Program',
      category: 'Navigation',
      icon: Settings,
      action: () => { navigate('/admin/settings'); onClose(); },
    },

    // Actions
    {
      id: 'act-new-sale',
      title: 'Start New Sale / Reset POS',
      category: 'Actions',
      shortcut: 'Alt + 1',
      icon: ShoppingCart,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'act-adjust-stock',
      title: 'Adjust Stock & Thresholds',
      category: 'Actions',
      shortcut: 'Alt + A',
      icon: SlidersHorizontal,
      action: () => { navigate('/inventory'); onClose(); },
    },
    {
      id: 'act-batches-expiry',
      title: 'Manage Batches & Expiry Dates',
      category: 'Actions',
      shortcut: 'Alt + B',
      icon: Clock,
      action: () => { navigate('/inventory'); onClose(); },
    },
    {
      id: 'act-po-low-stock',
      title: '1-Click Auto PO for Low Stock',
      category: 'Actions',
      shortcut: 'Alt + O',
      icon: Zap,
      action: () => { navigate('/inventory'); onClose(); },
    },

    // POS Hotkeys (Quick Reference)
    {
      id: 'hk-search',
      title: 'POS: Focus Search / Barcode',
      category: 'POS Hotkey',
      shortcut: 'F2',
      icon: Search,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'hk-customer',
      title: 'POS: Add / Select Customer',
      category: 'POS Hotkey',
      shortcut: 'F3 / Alt+C',
      icon: Users,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'hk-pay',
      title: 'POS: Pay & Finalize Sale',
      category: 'POS Hotkey',
      shortcut: 'F4 / Ctrl+Enter',
      icon: Receipt,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'hk-cash',
      title: 'POS: Select Cash Payment',
      category: 'POS Hotkey',
      shortcut: 'Space / F5',
      icon: DollarSign,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'hk-upi',
      title: 'POS: Select UPI QR Mode',
      category: 'POS Hotkey',
      shortcut: 'F6',
      icon: Zap,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'hk-card',
      title: 'POS: Select Card Payment',
      category: 'POS Hotkey',
      shortcut: 'F7',
      icon: Receipt,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'hk-hold',
      title: 'POS: Park Current Sale',
      category: 'POS Hotkey',
      shortcut: 'F8',
      icon: Clock,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'hk-held',
      title: 'POS: Open Parked Sales',
      category: 'POS Hotkey',
      shortcut: 'F9',
      icon: Clock,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'hk-discount',
      title: 'POS: Cart Discount',
      category: 'POS Hotkey',
      shortcut: 'F10 / Ctrl+D',
      icon: Tags,
      action: () => { navigate('/pos'); onClose(); },
    },
    {
      id: 'hk-loyalty',
      title: 'POS: Redeem Loyalty Points',
      category: 'POS Hotkey',
      shortcut: 'Ctrl + L',
      icon: Zap,
      action: () => { navigate('/pos'); onClose(); },
    },
  ], [navigate, onClose]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter(
      c => c.title.toLowerCase().includes(q) ||
           c.category.toLowerCase().includes(q) ||
           (c.shortcut && c.shortcut.toLowerCase().includes(q))
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1 < filteredCommands.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredCommands.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border-2 border-ink rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b-2 border-line bg-paper-alt">
          <Search size={18} className="text-ink-soft flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page… (e.g. pos, inventory, batches)"
            className="flex-1 bg-transparent text-sm font-medium text-ink placeholder-ink-soft/70 focus:outline-none"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="text-ink-soft hover:text-ink">
              <X size={16} />
            </button>
          ) : (
            <kbd className="text-[10px] font-mono font-bold bg-ink/10 text-ink-soft px-1.5 py-0.5 rounded border border-ink/20">
              ESC
            </kbd>
          )}
        </div>

        {/* List items */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-line/40">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-ink-soft text-sm">
              No matching commands or pages found.
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-paper-alt text-ink font-semibold' : 'text-ink-soft hover:bg-paper-alt/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-teal text-white' : 'bg-paper text-ink-soft border border-line'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div className="truncate">
                      <p className={`text-sm leading-tight truncate ${isSelected ? 'text-ink font-bold' : 'text-ink'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-ink-soft uppercase tracking-wider font-mono">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {item.shortcut && (
                      <kbd className="px-2 py-0.5 text-xs font-mono font-bold bg-paper text-ink rounded border-2 border-line shadow-xs">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight size={14} className="text-teal-dark" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-paper-alt border-t-2 border-line flex items-center justify-between text-[11px] text-ink-soft">
          <div className="flex items-center gap-2">
            <span>Navigate: <kbd className="font-mono bg-white px-1 border rounded">↑</kbd> <kbd className="font-mono bg-white px-1 border rounded">↓</kbd></span>
            <span>Select: <kbd className="font-mono bg-white px-1 border rounded">↵</kbd></span>
          </div>
          <div>
            <span>Press <kbd className="font-mono bg-white px-1 border rounded">Ctrl + K</kbd> anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
};
