import React from 'react';
import type { TxType } from '@/lib/mockData';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  ArrowDownCircle,
  ShoppingCart,
  Zap,
  Receipt,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface TxTypeIconProps {
  type: TxType;
  direction: 'in' | 'out';
}

const TYPE_CONFIG: Record<TxType, { icon: React.ElementType; label: string }> = {
  deposit: { icon: ArrowDownToLine, label: 'Deposit' },
  withdrawal: { icon: ArrowUpFromLine, label: 'Withdrawal' },
  send: { icon: Send, label: 'Send' },
  receive: { icon: ArrowDownCircle, label: 'Receive' },
  buy: { icon: ShoppingCart, label: 'Buy' },
  topup: { icon: Zap, label: 'Top Up' },
  fee: { icon: Receipt, label: 'Fee' },
};

export default function TxTypeIcon({ type, direction }: TxTypeIconProps) {
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  const isIn = direction === 'in';
  return (
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isIn ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'
      }`}
    >
      <Icon size={16} />
    </div>
  );
}