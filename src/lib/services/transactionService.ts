'use client';

import { createClient } from '@/lib/supabase/client';
import type { TxType, TxStatus, Transaction } from '@/lib/mockData';
import type { CurrencyCode } from '@/lib/currency';

// ─── helpers ──────────────────────────────────────────────────────────────────

function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const cls = error.code.substring(0, 2);
    if (cls === '42' || cls === '08') return true;
    if (cls === '23') return false;
  }
  if (error.message) {
    const patterns = [
      /relation.*does not exist/i,
      /column.*does not exist/i,
      /function.*does not exist/i,
      /syntax error/i,
      /type.*does not exist/i,
    ];
    return patterns.some((p) => p.test(error.message));
  }
  return false;
}

/** Convert a DB row (snake_case) → app Transaction (camelCase-ish) */
function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.tx_type as TxType,
    currency: row.currency as CurrencyCode,
    amount: Number(row.amount),
    direction: row.direction as 'in' | 'out',
    status: row.tx_status as TxStatus,
    date: new Date(row.created_at).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }),
    description: row.description,
    reference: row.reference,
    channel: row.channel,
    fee: row.fee != null ? Number(row.fee) : undefined,
  };
}

// ─── service ──────────────────────────────────────────────────────────────────

export const transactionService = {
  /** Fetch all transactions for the authenticated user, newest first */
  async getAll(): Promise<Transaction[]> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaError(error)) {
          console.error('Schema error:', error.message);
          throw error;
        }
        console.log('Transactions fetch error:', error.message);
        return [];
      }

      return (data ?? []).map(rowToTransaction);
    } catch (err: any) {
      console.log('transactionService.getAll error:', err.message);
      throw err;
    }
  },

  /** Fetch a single transaction by id for the authenticated user */
  async getById(id: string): Promise<Transaction | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error)) {
          console.error('Schema error:', error.message);
          throw error;
        }
        console.log('Transaction getById error:', error.message);
        return null;
      }

      return data ? rowToTransaction(data) : null;
    } catch (err: any) {
      console.log('transactionService.getById error:', err.message);
      throw err;
    }
  },

  /** Fetch recent N transactions for the authenticated user */
  async getRecent(limit = 5): Promise<Transaction[]> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (isSchemaError(error)) {
          console.error('Schema error:', error.message);
          throw error;
        }
        console.log('Transactions getRecent error:', error.message);
        return [];
      }

      return (data ?? []).map(rowToTransaction);
    } catch (err: any) {
      console.log('transactionService.getRecent error:', err.message);
      throw err;
    }
  },

  /** Insert a new transaction record for the authenticated user */
  async create(payload: {
    type: TxType;
    currency: CurrencyCode;
    amount: number;
    direction: 'in' | 'out';
    status?: TxStatus;
    description: string;
    reference: string;
    channel: string;
    fee?: number;
  }): Promise<Transaction | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          tx_type: payload.type,
          currency: payload.currency,
          amount: payload.amount,
          direction: payload.direction,
          tx_status: payload.status ?? 'pending',
          description: payload.description,
          reference: payload.reference,
          channel: payload.channel,
          fee: payload.fee ?? 0,
        })
        .select()
        .single();

      if (error) {
        if (isSchemaError(error)) {
          console.error('Schema error:', error.message);
          throw error;
        }
        console.log('Transaction create error:', error.message);
        return null;
      }

      return data ? rowToTransaction(data) : null;
    } catch (err: any) {
      console.log('transactionService.create error:', err.message);
      throw err;
    }
  },

  /** Update the status of a transaction */
  async updateStatus(id: string, status: TxStatus): Promise<Transaction | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ tx_status: status })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (isSchemaError(error)) {
          console.error('Schema error:', error.message);
          throw error;
        }
        console.log('Transaction updateStatus error:', error.message);
        return null;
      }

      return data ? rowToTransaction(data) : null;
    } catch (err: any) {
      console.log('transactionService.updateStatus error:', err.message);
      throw err;
    }
  },
};
