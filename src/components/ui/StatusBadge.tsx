import React from 'react';
import type { TxStatus } from '@/lib/mockData';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface StatusBadgeProps {
  status: TxStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG = {
  completed: { label: 'Completed', className: 'status-completed', icon: CheckCircle2 },
  pending: { label: 'Pending', className: 'status-pending', icon: Clock },
  processing: { label: 'Processing', className: 'status-processing', icon: Loader2 },
  failed: { label: 'Failed', className: 'status-failed', icon: XCircle },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const isProcessing = status === 'processing';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${cfg.className} ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      <Icon size={size === 'sm' ? 10 : 12} className={isProcessing ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}