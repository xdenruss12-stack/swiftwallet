'use client';
import React, { useState } from 'react';
import PlatformGrid from './PlatformGrid';
import { fmtCurrency } from '@/lib/currency';
import { USDT_WALLET_ADDRESS } from '@/lib/mockData';
import { Copy, QrCode, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

const TABS = ['Buy', 'Send', 'Top Up'] as const;
type Tab = typeof TABS[number];

interface SendForm { address: string; amount: string; }
interface BuyForm { amount: string; }

export default function UsdtActionTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('Buy');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendForm = useForm<SendForm>({ defaultValues: { address: '', amount: '' } });
  const buyForm = useForm<BuyForm>({ defaultValues: { amount: '' } });

  async function handleBuy(data: BuyForm) {
    if (!selectedPlatform) { toast.error('Select a platform to buy USDT'); return; }
    setIsLoading(true);
    // Backend integration: POST /api/usdt/buy
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    toast.success(`Buy order of $${data.amount} USDT via ${selectedPlatform} submitted`);
    buyForm.reset();
  }

  async function handleSend(data: SendForm) {
    setIsLoading(true);
    // Backend integration: POST /api/usdt/send
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    toast.success(`${data.amount} USDT sent to ${data.address.slice(0, 8)}...`);
    sendForm.reset();
  }

  function handleCopyAddress() {
    toast.success('Wallet address copied');
  }

  return (
    <div className="card-surface">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={`usdt-tab-${tab}`}
            onClick={()=> setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold transition-all duration-150 border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-5 fade-in">
        {/* Buy Tab */}
        {activeTab === 'Buy' && (
          <form onSubmit={buyForm.handleSubmit(handleBuy)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Select Platform</label>
              <p className="text-xs text-muted-foreground mb-3">Choose where you will purchase USDT from</p>
              <PlatformGrid selectedId={selectedPlatform} onSelect={setSelectedPlatform} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Amount (USDT)</label>
              <p className="text-xs text-muted-foreground mb-2">Minimum purchase: $10 USDT</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">$</span>
                <input
                  {...buyForm.register('amount', {
                    required: 'Amount is required',
                    validate: (v) => {
                      const n = parseFloat(v);
                      if (isNaN(n) || n < 10) return 'Minimum $10 USDT';
                      if (n > 10000) return 'Maximum $10,000 USDT per transaction';
                      return true;
                    },
                  })}
                  type="number"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-tabular text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              {buyForm.formState.errors.amount && (
                <p className="text-xs text-danger mt-1.5">{buyForm.formState.errors.amount.message}</p>
              )}
            </div>
            {buyForm.watch('amount') && !isNaN(parseFloat(buyForm.watch('amount'))) && parseFloat(buyForm.watch('amount')) > 0 && (
              <div className="p-3 bg-secondary rounded-xl text-sm space-y-1.5">
                <div className="fee-row">
                  <span className="text-muted-foreground">You Pay</span>
                  <span className="font-tabular">{fmtCurrency(parseFloat(buyForm.watch('amount')), 'USDT')}</span>
                </div>
                <div className="fee-row">
                  <span className="text-muted-foreground">≈ PHP Value</span>
                  <span className="font-tabular text-php">{fmtCurrency(parseFloat(buyForm.watch('amount')) * 57.14, 'PHP')}</span>
                </div>
                <div className="fee-row">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="font-tabular text-danger">~$2.50</span>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-usdt text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
              ) : 'Buy USDT'}
            </button>
          </form>
        )}

        {/* Send Tab */}
        {activeTab === 'Send' && (
          <form onSubmit={sendForm.handleSubmit(handleSend)} className="space-y-4">
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl flex items-start gap-2">
              <AlertCircle size={14} className="text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-warning">Double-check the recipient address. USDT transfers cannot be reversed.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Recipient Address</label>
              <p className="text-xs text-muted-foreground mb-2">ERC20 or TRC20 wallet address</p>
              <input
                {...sendForm.register('address', {
                  required: 'Recipient address is required',
                  minLength: { value: 26, message: 'Enter a valid wallet address (min 26 chars)' },
                })}
                type="text"
                placeholder="0x... or T..."
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-mono text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {sendForm.formState.errors.address && (
                <p className="text-xs text-danger mt-1.5">{sendForm.formState.errors.address.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Amount (USDT)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">$</span>
                <input
                  {...sendForm.register('amount', {
                    required: 'Amount is required',
                    validate: (v) => {
                      const n = parseFloat(v);
                      if (isNaN(n) || n <= 0) return 'Enter a valid amount';
                      if (n > 847.32) return 'Insufficient USDT balance';
                      return true;
                    },
                  })}
                  type="number"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground font-tabular text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              {sendForm.formState.errors.amount && (
                <p className="text-xs text-danger mt-1.5">{sendForm.formState.errors.amount.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
              ) : 'Send USDT'}
            </button>
          </form>
        )}

        {/* Top Up Tab */}
        {activeTab === 'Top Up' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Your USDT Receive Address</p>
              <p className="text-xs text-muted-foreground mb-3">Send USDT to this address from any supported platform</p>
              <PlatformGrid selectedId={selectedPlatform} onSelect={setSelectedPlatform} />
            </div>
            <div className="p-4 bg-secondary rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Wallet Address</span>
                <button onClick={handleCopyAddress} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Copy size={12} /> Copy
                </button>
              </div>
              <p className="font-mono text-xs text-foreground break-all leading-relaxed">{USDT_WALLET_ADDRESS}</p>
              <div className="flex items-center justify-center p-4 bg-white rounded-xl">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center mb-2">
                    <QrCode size={48} className="text-gray-600" />
                  </div>
                  <p className="text-xs text-gray-500">QR Code</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl">
              <p className="text-xs text-accent font-medium mb-1">Supported Networks</p>
              <p className="text-xs text-muted-foreground">ERC20 (Ethereum), TRC20 (Tron), BEP20 (BSC)</p>
              <p className="text-xs text-warning mt-1.5">⚠ Only send USDT. Sending other tokens may result in permanent loss.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}