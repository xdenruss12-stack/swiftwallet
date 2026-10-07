'use client';
import React, { useState } from 'react';
import { KRW_BANKS } from '@/lib/banks';
import BankLogo from '@/components/ui/BankLogo';
import { CheckCircle2 } from 'lucide-react';
import { USER_BANK_ACCOUNTS } from '@/lib/mockData';
import { getBankById } from '@/lib/banks';

interface KrwBankTabsProps {
  selectedAcctId: string | null;
  onSelect: (id: string) => void;
}

const TOSS_BANK = KRW_BANKS.find((b) => b.id === 'toss')!;
const KAKAO_BANK = KRW_BANKS.find((b) => b.id === 'kakao')!;

export default function KrwBankTabs({ selectedAcctId, onSelect }: KrwBankTabsProps) {
  const [activeTab, setActiveTab] = useState<'toss' | 'traditional'>('toss');

  const tossAccounts = USER_BANK_ACCOUNTS.filter(
    (a) => a.currency === 'KRW' && (a.bankId === 'toss' || a.bankId === 'kakao')
  );
  const traditionalAccounts = USER_BANK_ACCOUNTS.filter(
    (a) => a.currency === 'KRW' && a.bankId !== 'toss' && a.bankId !== 'kakao'
  );

  const currentAccounts = activeTab === 'toss' ? tossAccounts : traditionalAccounts;

  return (
    <div>
      {/* Tab Selector */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('toss')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
            activeTab === 'toss' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold"
            style={{ backgroundColor: TOSS_BANK.color, color: TOSS_BANK.textColor }}>
            TB
          </div>
          Toss / Kakao
        </button>
        <button
          onClick={() => setActiveTab('traditional')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
            activeTab === 'traditional' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
            <span className="text-[8px] text-primary font-bold">KR</span>
          </div>
          Korean Banks
        </button>
      </div>

      {/* Account List */}
      <div className="space-y-2">
        {currentAccounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No {activeTab === 'toss' ? 'Toss/Kakao' : 'Korean bank'} accounts linked.</p>
            <p className="text-xs text-muted-foreground mt-1">Add an account in Settings.</p>
          </div>
        ) : (
          currentAccounts.map((acct) => {
            const bank = getBankById(acct.bankId, 'KRW');
            const isSelected = selectedAcctId === acct.id;
            return (
              <button
                key={`krw-acct-${acct.id}`}
                onClick={() => onSelect(acct.id)}
                className={`bank-card w-full ${isSelected ? 'selected' : ''}`}
              >
                {bank && <BankLogo bank={bank} size="md" />}
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">{bank?.name ?? acct.bankId}</p>
                  <p className="text-xs text-muted-foreground font-mono">{acct.accountNumber}</p>
                  <p className="text-xs text-muted-foreground">{acct.accountName}</p>
                </div>
                {acct.isPrimary && (
                  <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">Primary</span>
                )}
                {isSelected && <CheckCircle2 size={18} className="text-primary flex-shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      {/* All KRW Banks reference */}
      {activeTab === 'traditional' && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Supported Korean Banks</p>
          <div className="flex flex-wrap gap-1.5">
            {KRW_BANKS.filter((b) => b.id !== 'toss' && b.id !== 'kakao').map((bank) => (
              <div key={`krw-bank-ref-${bank.id}`} className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-lg">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold"
                  style={{ backgroundColor: bank.color, color: bank.textColor }}
                >
                  {bank.initial.slice(0, 2)}
                </div>
                <span className="text-xs text-muted-foreground">{bank.shortName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}