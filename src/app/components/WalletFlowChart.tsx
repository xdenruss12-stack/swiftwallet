'use client';
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MONTHLY_FLOW } from '@/lib/mockData';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated p-3 shadow-xl text-xs space-y-1 min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{label} 2026</p>
      {payload.map((p) => (
        <div key={`tip-${p.name}`} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground font-tabular">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

interface WalletFlowChartProps {
  activeCurrency: 'PHP' | 'KRW' | 'USDT';
}

const CURRENCY_CHART_CONFIG = {
  PHP: {
    inKey: 'phpIn',
    outKey: 'phpOut',
    inColor: 'var(--php)',
    outColor: 'var(--danger)',
    gradientIn: 'phpInGrad',
    gradientOut: 'phpOutGrad',
  },
  KRW: {
    inKey: 'krwIn',
    outKey: 'krwOut',
    inColor: 'var(--krw)',
    outColor: 'var(--danger)',
    gradientIn: 'krwInGrad',
    gradientOut: 'krwOutGrad',
  },
  USDT: {
    inKey: 'usdtIn',
    outKey: 'usdtOut',
    inColor: 'var(--usdt)',
    outColor: 'var(--danger)',
    gradientIn: 'usdtInGrad',
    gradientOut: 'usdtOutGrad',
  },
};

export default function WalletFlowChart({ activeCurrency }: WalletFlowChartProps) {
  const cfg = CURRENCY_CHART_CONFIG[activeCurrency];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={MONTHLY_FLOW} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={cfg.gradientIn} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={cfg.inColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={cfg.inColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={cfg.gradientOut} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={cfg.outColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={cfg.outColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
        <Area type="monotone" dataKey={cfg.inKey} name="Inflow" stroke={cfg.inColor} fill={`url(#${cfg.gradientIn})`} strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey={cfg.outKey} name="Outflow" stroke={cfg.outColor} fill={`url(#${cfg.gradientOut})`} strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}