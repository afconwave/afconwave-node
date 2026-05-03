import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AfconWaveConfig {
    secretKey: string;
    baseUrl?: string;
    timeout?: number;
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

export interface ListResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    limit: number;
}

// ─── Custom Errors ─────────────────────────────────────────────────────────────

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

// ─── Webhook Helper ───────────────────────────────────────────────────────────

export interface WebhookVerificationOptions {
    payload: string;
    signature: string;
    secret: string;
}

/**
 * Verifies that an incoming webhook was sent by AfconWave.
 */
export function verifyWebhookSignature(options: WebhookVerificationOptions): boolean {
    const { payload, signature, secret } = options;
    if (!signature || !secret) return false;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// ─── Main Client ───────────────────────────────────────────────────────────────

export class AfconWave {
    private client: AxiosInstance;

    constructor(config: AfconWaveConfig) {
        this.client = axios.create({
            baseURL: config.baseUrl || 'https://api.afconwave.com/v1',
            timeout: config.timeout || 30000,
            headers: {
                'Authorization': `Bearer ${config.secretKey}`,
                'Content-Type': 'application/json',
            },
        });

        // Error Interceptor to wrap Axios errors in custom AfconWave errors
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

    // ─── Top-level Convenience Methods (Matches README) ─────────────────────

    public async createPayment(data: PaymentRequest): Promise<PaymentResponse> {
        return this.payments.create(data);
    }

    public async retrievePayment(id: string): Promise<PaymentResponse> {
        return this.payments.retrieve(id);
    }

    public async listPayments(params?: { limit?: number; page?: number; status?: string }): Promise<ListResponse<PaymentResponse>> {
        return this.payments.list(params);
    }

    public async createPayout(data: any): Promise<any> {
        return this.payouts.create(data);
    }

    // ─── Resource-based API ──────────────────────────────────────────────────

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
        create: async (data: any): Promise<any> => {
            const response = await this.client.post('/payouts', data);
            return response.data?.data || response.data;
        },
        retrieve: async (id: string): Promise<any> => {
            const response = await this.client.get(`/payouts/${id}`);
            return response.data?.data || response.data;
        },
    };

    public readonly crypto = {
        buy: async (data: { amount: number; currency: string }): Promise<any> => {
            const response = await this.client.post('/crypto/buy', data);
            return response.data?.data || response.data;
        },
    };

    public readonly refunds = {
        create: async (data: { paymentId: string; amount: number; reason?: string }): Promise<any> => {
            const response = await this.client.post('/refunds', data);
            return response.data?.data || response.data;
        },
        list: async (): Promise<any> => {
            const response = await this.client.get('/refunds');
            return response.data;
        },
    };

    public readonly disputes = {
        open: async (data: { transactionId: string; reason: string; description: string }): Promise<any> => {
            const response = await this.client.post('/disputes', data);
            return response.data?.data || response.data;
        },
        list: async (): Promise<any> => {
            const response = await this.client.get('/disputes');
            return response.data;
        },
        resolve: async (disputeId: string, data: { resolution: 'WON' | 'LOST'; resolutionDetails?: string }): Promise<any> => {
            const response = await this.client.post(`/disputes/${disputeId}/resolve`, data);
            return response.data?.data || response.data;
        },
    };
}


