'use client';
import React from 'react';
import { isPaymentChannelEnabled, getChannelMaintenanceNote } from '@/lib/paymentChannels';
import type { PaymentChannel } from '@/lib/paymentChannels';
import { Lock } from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  channel: PaymentChannel;
  color: string;
  initial: string;
  description: string;
}

const PLATFORMS: Platform[] = [
  { id: 'binance', name: 'Binance', channel: 'USDT_BINANCE', color: '#F0B90B', initial: 'BN', description: 'TRC20 / ERC20' },
  { id: 'trust', name: 'Trust Wallet', channel: 'USDT_TRUST_WALLET', color: '#3375BB', initial: 'TW', description: 'Multi-chain' },
  { id: 'metamask', name: 'MetaMask', channel: 'USDT_METAMASK', color: '#E2761B', initial: 'MM', description: 'ERC20 only' },
  { id: 'coinbase', name: 'Coinbase', channel: 'USDT_COINBASE', color: '#0052FF', initial: 'CB', description: 'ERC20 only' },
  { id: 'okx', name: 'OKX', channel: 'USDT_OKX', color: '#1A1A1A', initial: 'OX', description: 'TRC20 / ERC20' },
  { id: 'bybit', name: 'Bybit', channel: 'USDT_BYBIT', color: '#F7A600', initial: 'BB', description: 'ERC20 / TRC20' },
];

interface PlatformGridProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PlatformGrid({ selectedId, onSelect }: PlatformGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {PLATFORMS.map((p) => {
        const enabled = isPaymentChannelEnabled(p.channel);
        const note = getChannelMaintenanceNote(p.channel);
        const isSelected = selectedId === p.id;
        return (
          <button
            key={`platform-${p.id}`}
            onClick={() => enabled && onSelect(p.id)}
            disabled={!enabled}
            title={note ?? p.name}
            className={`platform-card relative ${isSelected ? 'selected' : ''} ${!enabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {!enabled && (
              <div className="absolute top-1.5 right-1.5">
                <Lock size={10} className="text-muted-foreground" />
              </div>
            )}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs"
              style={{ backgroundColor: p.color, color: p.color === '#1A1A1A' ? '#fff' : '#000' }}
            >
              {p.initial}
            </div>
            <span className="text-xs font-medium text-foreground text-center leading-tight">{p.name}</span>
            <span className="text-[10px] text-muted-foreground">{p.description}</span>
          </button>
        );
      })}
    </div>
  );
}