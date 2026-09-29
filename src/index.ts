import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';

export interface AfconWaveConfig {
    secretKey: string;
    baseUrl?: string;
    timeout?: number;
    sandbox?: boolean;
}

export interface PaymentRequest {
    amount: number;
    currency: string;
    description?: string;
    callback_url: string;
    customer_email?: string;
    metadata?: Record<string, any>;
    customer?: {
        name?: string;
        email?: string;
        phone?: string;
    };
}

export interface PaymentResponse {
    id: string;
    status: 'pending' | 'success' | 'failed';
    reference: string;
    amount: number;
    currency: string;
    checkout_url: string;
    customer_email?: string;
    metadata?: Record<string, any>;
    paid_at?: string;
    createdAt: string;
}

export interface PayoutRequest {
    amount: number;
    currency: string;
    reference: string;
    recipient: {
        phone?: string;
        account_number?: string;
        bank_code?: string;
        name: string;
        network?: 'MTN' | 'ORANGE' | 'MOOV' | 'WAVE' | 'AIRTEL';
    };
    metadata?: Record<string, any>;
}

export interface PayoutResponse {
    id: string;
    status: 'pending' | 'success' | 'failed' | 'processing';
    amount: number;
    currency: string;
    reference: string;
    fee: number;
    createdAt: string;
}

export interface BalanceResponse {
    currency: string;
    available_balance: number;
    pending_balance: number;
    reserved_balance: number;
}

export interface ListResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export class AfconWaveError extends Error {
    constructor(public message: string, public status?: number, public code?: string) {
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

export class PaymentError extends AfconWaveError {
    constructor(message: string, code?: string) {
        super(message, 400, code || 'PAYMENT_ERROR');
        this.name = 'PaymentError';
    }
}

export interface WebhookVerificationOptions {
    payload: string;
    signature: string;
    secret: string;
    tolerance?: number;
}

/**
 * Verifies that an incoming webhook was sent by AfconWave and is not a replay.
 * timingSafeEqual throws if Buffer lengths differ — always compare lengths first.
 */
export function verifyWebhookSignature(options: WebhookVerificationOptions): boolean {
    const { payload, signature, secret, tolerance = 300 } = options;
    if (!signature || !secret) return false;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    if (signature.length !== expectedSignature.length) {
        return false;
    }

    const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );

    if (!isSignatureValid) return false;

    try {
        const body = JSON.parse(payload);
        const timestamp = body.timestamp || body.created_at || body.createdAt;

        if (timestamp) {
            const currentTime = Date.now();
            const webhookTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
            const ageInSeconds = Math.abs(currentTime - webhookTime) / 1000;

            if (ageInSeconds > tolerance) {
                return false;
            }
        }
    } catch {
        // Non-JSON payload: signature-only check
    }

    return true;
}

export class AfconWave {
    private client: AxiosInstance;

    constructor(config: AfconWaveConfig) {
        const defaultBaseUrl = process.env.AFCONWAVE_BASE_URL || (config.sandbox
            ? 'https://sandbox.api.afconwave.com/v1'
            : 'https://api.afconwave.com/v1');

        this.client = axios.create({
            baseURL: config.baseUrl || defaultBaseUrl,
            timeout: config.timeout || 30000,
            headers: {
                'Authorization': `Bearer ${config.secretKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'AfconWave-Node-SDK/1.1.1',
            },
        });

        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                const data: any = error.response?.data;
                const status = error.response?.status;

                if (status === 401) throw new AuthError(data?.error || 'Invalid API Key');

                throw new AfconWaveError(
                    data?.error || error.message,
                    status,
                    data?.code
                );
            }
        );
    }

    public async createPayment(data: PaymentRequest): Promise<PaymentResponse> {
        return this.payments.create(data);
    }

    public async retrievePayment(id: string): Promise<PaymentResponse> {
        return this.payments.retrieve(id);
    }

    public async listPayments(params?: { limit?: number; page?: number; status?: string }): Promise<ListResponse<PaymentResponse>> {
        return this.payments.list(params);
    }

    public async createPayout(data: PayoutRequest): Promise<PayoutResponse> {
        return this.payouts.create(data);
    }

    public async getBalances(): Promise<BalanceResponse[]> {
        const response = await this.client.get('/balances');
        return response.data?.data || response.data;
    }

    public readonly payments = {
        create: async (data: PaymentRequest): Promise<PaymentResponse> => {
            const response = await this.client.post('/payments', data);
            return response.data?.data || response.data;
        },
        retrieve: async (id: string): Promise<PaymentResponse> => {
            const response = await this.client.get(`/payments/${id}`);
            return response.data?.data || response.data;
        },
        list: async (params?: { limit?: number; page?: number; status?: string }): Promise<ListResponse<PaymentResponse>> => {
            const response = await this.client.get('/payments', { params });
            return response.data;
        },
    };

    public readonly payouts = {
        create: async (data: PayoutRequest): Promise<PayoutResponse> => {
            const response = await this.client.post('/payouts', data);
            return response.data?.data || response.data;
        },
        retrieve: async (id: string): Promise<PayoutResponse> => {
            const response = await this.client.get(`/payouts/${id}`);
            return response.data?.data || response.data;
        },
        list: async (params?: { limit?: number; page?: number }): Promise<ListResponse<PayoutResponse>> => {
            const response = await this.client.get('/payouts', { params });
            return response.data;
        },
    };

    public readonly crypto = {
        buy: async (data: { amount: number; currency: string; asset?: string }): Promise<any> => {
            const response = await this.client.post('/crypto/buy', data);
            return response.data?.data || response.data;
        },
        getQuotes: async (pair: string): Promise<any> => {
            const response = await this.client.get(`/crypto/quotes/${pair}`);
            return response.data?.data || response.data;
        },
    };

    public readonly refunds = {
        create: async (data: { paymentId: string; amount: number; reason?: string }): Promise<any> => {
            const response = await this.client.post('/refunds', data);
            return response.data?.data || response.data;
        },
        list: async (params?: { limit?: number; page?: number }): Promise<any> => {
            const response = await this.client.get('/refunds', { params });
            return response.data;
        },
    };

    public readonly disputes = {
        open: async (data: { transactionId: string; reason: string; description: string }): Promise<any> => {
            const response = await this.client.post('/disputes', data);
            return response.data?.data || response.data;
        },
        list: async (params?: { limit?: number; page?: number }): Promise<any> => {
            const response = await this.client.get('/disputes', { params });
            return response.data;
        },
        resolve: async (disputeId: string, data: { resolution: 'WON' | 'LOST'; resolutionDetails?: string }): Promise<any> => {
            const response = await this.client.post(`/disputes/${disputeId}/resolve`, data);
            return response.data?.data || response.data;
        },
    };
}
