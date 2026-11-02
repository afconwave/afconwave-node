import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';

export interface AfconWaveConfig {
  /** Merchant secret key: afcw_test_... or afcw_live_... */
  secretKey: string;
  /** Override base URL (default: https://api.afconwave.com/v1) */
  baseUrl?: string;
  timeout?: number;
  /** Force sandbox base URL when true (keys with _test_ already route to sandbox behaviour server-side) */
  sandbox?: boolean;
}

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface DepositCreateParams {
  amount: number;
  country_code: string;
  currency?: string;
  name?: string;
  email?: string;
  mobile?: string;
  description?: string;
  payment_method?: string;
  mode?: 'link' | 'direct';
  pass_digital_charge?: boolean;
  business_id?: string;
  idempotency_key?: string;
}

export interface DepositResponse {
  success: boolean;
  reference: string;
  status: TransactionStatus | string;
  amount_paid: number;
  fee: number;
  fee_percent?: number;
  net_credited_on_success: number;
  currency: string;
  country_code?: string;
  payment_method?: string;
  payment_link?: string;
  mode?: string;
  sandbox?: boolean;
  quote?: Record<string, unknown>;
  message?: string;
  provider?: Record<string, unknown>;
  idempotency_key?: string;
  duplicate?: boolean;
}

export interface WithdrawalCreateParams {
  amount: number;
  currency: string;
  country_code: string;
  payment_method: string;
  beneficiary_name: string;
  mobile_no: string;
  account_number?: string;
  bank_code?: string;
  address?: string;
  remarks?: string;
  ifsc?: string;
  routing_number?: string;
  account_type?: string;
  business_id?: string;
  idempotency_key?: string;
  pin?: string;
}

export interface WithdrawalResponse {
  success: boolean;
  reference: string;
  status: TransactionStatus | string;
  amount_to_beneficiary: number;
  fee: number;
  fee_percent?: number;
  debit_total: number;
  currency: string;
  quote?: Record<string, unknown>;
  sandbox?: boolean;
  provider?: Record<string, unknown>;
  idempotency_key?: string;
  duplicate?: boolean;
  message?: string;
}

export interface Wallet {
  id: string;
  currency: string;
  balance: string;
  owner_type?: string;
}

export interface TransferParams {
  currency: string;
  amount: number;
  to_user_id?: string;
  to_email?: string;
  to_business_id?: string;
  from_business_id?: string;
  idempotency_key?: string;
  pin?: string;
}

export interface FxConvertParams {
  from_currency: string;
  to_currency: string;
  amount: number;
  business_id?: string;
  idempotency_key?: string;
  pin?: string;
}

export interface RefundParams {
  reference?: string;
  payment_id?: string;
  amount?: number;
  reason?: string;
}

export interface ListTransactionsParams {
  limit?: number;
  offset?: number;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
  business_id?: string;
}

export class AfconWaveError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AfconWaveError';
  }
}

export class AuthError extends AfconWaveError {
  constructor(message: string = 'Invalid API Key') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export interface WebhookVerificationOptions {
  payload: string;
  signature: string;
  secret: string;
  /** When true, signature is HMAC-SHA256 of `timestamp.rawBody` (Swychr style) */
  timestampPrefixed?: boolean;
  timestamp?: string;
  tolerance?: number;
}

/**
 * Verify merchant or provider webhook signatures.
 * Default: HMAC-SHA256(payload) hex digest.
 * For Swychr pay-in: pass timestampPrefixed + timestamp so the message is `${timestamp}.${payload}`.
 */
export function verifyWebhookSignature(options: WebhookVerificationOptions): boolean {
  const {
    payload,
    signature,
    secret,
    timestampPrefixed = false,
    timestamp,
    tolerance = 300,
  } = options;
  if (!signature || !secret) return false;

  const message =
    timestampPrefixed && timestamp ? `${timestamp}.${payload}` : payload;

  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');

  if (signature.length !== expected.length) return false;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return false;
    }
  } catch {
    return false;
  }

  if (timestamp) {
    const ts = Number(timestamp);
    if (!Number.isNaN(ts)) {
      const age = Math.abs(Date.now() / 1000 - (ts > 1e12 ? ts / 1000 : ts));
      if (age > tolerance) return false;
    }
  }

  return true;
}

export class AfconWave {
  private client: AxiosInstance;
  private secretKey: string;

  constructor(config: AfconWaveConfig) {
    if (!config.secretKey || !config.secretKey.startsWith('afcw_')) {
      throw new AuthError('secretKey must be an afcw_test_... or afcw_live_... key');
    }

    this.secretKey = config.secretKey;

    const defaultBase =
      process.env.AFCONWAVE_BASE_URL ||
      (config.sandbox
        ? 'https://sandbox.api.afconwave.com/v1'
        : 'https://api.afconwave.com/v1');

    this.client = axios.create({
      baseURL: (config.baseUrl || defaultBase).replace(/\/$/, ''),
      timeout: config.timeout || 30000,
      headers: {
        'X-API-Key': config.secretKey,
        'Content-Type': 'application/json',
        'User-Agent': 'AfconWave-Node-SDK/2.0.0',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const data: any = error.response?.data;
        const status = error.response?.status;

        if (status === 401) {
          throw new AuthError(data?.error || 'Invalid API Key');
        }

        throw new AfconWaveError(
          data?.error || error.message,
          status,
          data?.code,
          data
        );
      }
    );
  }

  private withIdempotency(
    config: AxiosRequestConfig = {},
    key?: string
  ): AxiosRequestConfig {
    if (!key) return config;
    return {
      ...config,
      headers: {
        ...(config.headers || {}),
        'Idempotency-Key': key,
      },
    };
  }

  // ── Deposits (collections / pay-ins) ──────────────────────────────────────

  public readonly deposits = {
    create: async (data: DepositCreateParams): Promise<DepositResponse> => {
      const response = await this.client.post(
        '/deposits',
        data,
        this.withIdempotency({}, data.idempotency_key)
      );
      return response.data;
    },

    retrieve: async (reference: string): Promise<any> => {
      const response = await this.client.get(`/deposits/${reference}`);
      return response.data;
    },

    list: async (params?: { business_id?: string }): Promise<any> => {
      const response = await this.client.get('/deposits', { params });
      return response.data;
    },

    sync: async (reference: string): Promise<any> => {
      const response = await this.client.post(`/deposits/${reference}/sync`);
      return response.data;
    },
  };

  /** @deprecated Use deposits.create — kept for migration from v1 SDK */
  public async createPayment(data: DepositCreateParams): Promise<DepositResponse> {
    return this.deposits.create(data);
  }

  // ── Withdrawals (payouts) ─────────────────────────────────────────────────

  public readonly withdrawals = {
    create: async (data: WithdrawalCreateParams): Promise<WithdrawalResponse> => {
      const response = await this.client.post(
        '/withdrawals',
        data,
        this.withIdempotency({}, data.idempotency_key)
      );
      return response.data;
    },

    list: async (params?: { business_id?: string }): Promise<any> => {
      const response = await this.client.get('/withdrawals', { params });
      return response.data;
    },

    sync: async (reference: string): Promise<any> => {
      const response = await this.client.post(`/withdrawals/${reference}/sync`);
      return response.data;
    },

    methods: async (country_code: string): Promise<any> => {
      const response = await this.client.get('/withdrawals/methods', {
        params: { country_code },
      });
      return response.data;
    },

    nigeriaBanks: async (): Promise<any> => {
      const response = await this.client.get('/withdrawals/nigeria-banks');
      return response.data;
    },
  };

  /** @deprecated Use withdrawals.create */
  public async createPayout(data: WithdrawalCreateParams): Promise<WithdrawalResponse> {
    return this.withdrawals.create(data);
  }

  // ── Wallets & FX ──────────────────────────────────────────────────────────

  public readonly wallets = {
    list: async (params?: { business_id?: string }): Promise<{ success: boolean; wallets: Wallet[] }> => {
      const response = await this.client.get('/wallets', { params });
      return response.data;
    },

    ensure: async (currency: string, business_id?: string): Promise<any> => {
      const response = await this.client.post('/wallets/ensure', { currency, business_id });
      return response.data;
    },

    convert: async (data: FxConvertParams): Promise<any> => {
      const response = await this.client.post(
        '/wallets/convert',
        data,
        this.withIdempotency({}, data.idempotency_key)
      );
      return response.data;
    },

    transfer: async (data: TransferParams): Promise<any> => {
      const response = await this.client.post(
        '/wallets/transfer',
        data,
        this.withIdempotency({}, data.idempotency_key)
      );
      return response.data;
    },

    rates: async (): Promise<any> => {
      const response = await this.client.get('/wallets/rates');
      return response.data;
    },
  };

  public async getBalances(params?: { business_id?: string }): Promise<Wallet[]> {
    const res = await this.wallets.list(params);
    return res.wallets || [];
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  public readonly transactions = {
    list: async (params?: ListTransactionsParams): Promise<any> => {
      const response = await this.client.get('/transactions', { params });
      return response.data;
    },

    retrieve: async (idOrRef: string): Promise<any> => {
      const response = await this.client.get(`/transactions/${idOrRef}`);
      return response.data;
    },

    recent: async (limit = 4): Promise<any> => {
      const response = await this.client.get('/transactions/recent', {
        params: { limit },
      });
      return response.data;
    },
  };

  // ── Refunds ───────────────────────────────────────────────────────────────

  public readonly refunds = {
    create: async (data: RefundParams): Promise<any> => {
      const response = await this.client.post('/refunds', data);
      return response.data;
    },

    list: async (): Promise<any> => {
      const response = await this.client.get('/refunds');
      return response.data;
    },
  };

  // ── Disputes ──────────────────────────────────────────────────────────────

  public readonly disputes = {
    open: async (data: {
      transaction_id?: string;
      reference?: string;
      reason: string;
      description?: string;
    }): Promise<any> => {
      const response = await this.client.post('/disputes', data);
      return response.data;
    },

    list: async (): Promise<any> => {
      const response = await this.client.get('/disputes');
      return response.data;
    },
  };

  // ── Airtime / data ────────────────────────────────────────────────────────

  public readonly airtime = {
    purchase: async (data: Record<string, unknown>): Promise<any> => {
      const response = await this.client.post('/airtime', data);
      return response.data;
    },
  };

  public readonly data = {
    purchase: async (data: Record<string, unknown>): Promise<any> => {
      const response = await this.client.post('/data', data);
      return response.data;
    },
  };

  // ── Rails helpers ─────────────────────────────────────────────────────────

  public readonly rails = {
    payoutMethods: async (country_code: string): Promise<any> => {
      const response = await this.client.get('/rails/payout-methods', {
        params: { country_code },
      });
      return response.data;
    },
  };

  // ── Payment links ─────────────────────────────────────────────────────────

  public readonly paymentLinks = {
    create: async (data: Record<string, unknown>): Promise<any> => {
      const response = await this.client.post('/payment-links', data);
      return response.data;
    },

    list: async (): Promise<any> => {
      const response = await this.client.get('/payment-links');
      return response.data;
    },
  };

  // ── Low-level escape hatch ────────────────────────────────────────────────

  public async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.request({
      method,
      url: path.startsWith('/') ? path : `/${path}`,
      data,
      ...config,
    });
    return response.data;
  }
}

export default AfconWave;
