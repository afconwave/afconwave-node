# @afconwave/sdk — Official Node.js / TypeScript SDK

> The official Node.js and TypeScript client library for the AfconWave Payments API.

[![npm version](https://img.shields.io/npm/v/@afconwave/sdk.svg)](https://www.npmjs.com/package/@afconwave/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## Features

- ✅ Full **TypeScript** support — typed request payloads and response objects
- ⚡ **Promise-based** async/await API — clean and readable
- 🔒 **Secure by default** — API key injected at transport level
- 🌍 **Payments + Payouts** — single SDK for all money movement
- 🔔 **Webhook support** — built-in HMAC-SHA256 signature verification
- 🧪 **Sandbox-ready** — flip between test and live with one config change

---

## Installation

```bash
npm install @afconwave/sdk
# or
yarn add @afconwave/sdk
# or
pnpm add @afconwave/sdk
```

---

## Quick Start

```typescript
import { AfconWave } from '@afconwave/sdk';

const afw = new AfconWave({
  secretKey: 'sk_test_your_key_here',
  // baseUrl: 'https://api.afconwave.com/v1' // optional
});
```

---

## Usage Guide

### Create a Payment

```typescript
const payment = await afw.payments.create({
  amount: 5000,           // Amount in minor units (e.g., 5000 = 50 XAF)
  currency: 'XAF',       // ISO 4217: XAF, XOF, NGN, GHS, KES, etc.
  description: 'Order #1234',
  callback_url: 'https://yoursite.com/payment/callback',
  customer: {
    name: 'Jean Dupont',
    email: 'jean@example.com',
    phone: '+237600000000',
  },
  metadata: {
    order_id: 'ORD-1234',
  },
});

console.log(payment.checkout_url); // Redirect user here
console.log(payment.id);           // e.g., pay_507f191e8180f
```

### Retrieve a Payment

```typescript
const payment = await afw.payments.retrieve('pay_507f191e8180f');

console.log(payment.status); // "pending" | "success" | "failed"
console.log(payment.amount);
console.log(payment.paid_at);
```

### Create a Payout

```typescript
const payout = await afw.payouts.create({
  amount: 10000,
  currency: 'XAF',
  recipient: {
    phone: '+237600000001',
    network: 'MTN',       // "MTN" | "ORANGE" | "MOOV" | "WAVE"
    name: 'Marie Kamga',
  },
  reference: 'PAYOUT-REF-001',
});

console.log(payout.status); // "pending" | "success" | "failed"
```

### List Payments

```typescript
const result = await afw.payments.list({
  limit: 20,
  status: 'success',
  from: '2024-01-01',
  to: '2024-12-31',
});

console.log(result.data);   // Array of payments
console.log(result.total);
```

---

## Webhook Verification

Always verify that incoming webhooks are from AfconWave by checking the signature:

```typescript
import { verifyWebhookSignature } from '@afconwave/sdk';

app.post('/webhooks/afconwave', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-afconwave-signature'] as string;
  const webhookSecret = process.env.AFCONWAVE_WEBHOOK_SECRET!;

  const isValid = verifyWebhookSignature({
    payload: req.body.toString(),
    signature,
    secret: webhookSecret,
  });

  if (!isValid) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());

  switch (event.event) {
    case 'payment.success':
      // Fulfill the order
      console.log('Payment received:', event.data.id);
      break;
    case 'payment.failed':
      // Notify the customer
      break;
    case 'payout.success':
      // Update your records
      break;
  }

  res.status(200).send('OK');
});
```

---

## Error Handling

The SDK throws typed errors you can handle by type:

```typescript
import { AfconWave, AfconWaveError, AuthError, PaymentError } from '@afconwave/sdk';

try {
  const payment = await afw.payments.create({ ... });
} catch (err) {
  if (err instanceof AuthError) {
    console.error('Invalid API Key');
  } else if (err instanceof PaymentError) {
    console.error('Payment failed:', err.message, err.code);
  } else if (err instanceof AfconWaveError) {
    console.error('API Error:', err.status, err.message);
  }
}
```

---

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `secretKey` | `string` | **required** | Your AfconWave secret API key |
| `baseUrl` | `string` | `https://api.afconwave.com/v1` | API base URL (override for sandbox) |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |

---

## Sandbox / Testing

Use test keys prefixed with `sk_test_` to run in sandbox mode. No real money moves.

```typescript
const afw = new AfconWave({ secretKey: 'sk_test_...' });
```

Sandbox test cards and phone numbers are listed at [docs.afconwave.com/testing](https://docs.afconwave.com/testing).

---

## TypeScript Support

This SDK ships with full TypeScript type definitions. All methods are fully typed, including request payloads and response objects:

```typescript
import type { Payment, Payout, CreatePaymentPayload } from '@afconwave/sdk';
```

---

## API Reference

Full API documentation is available at [docs.afconwave.com/api-reference](https://docs.afconwave.com/api-reference).

---

## Contributing

1. Fork the repository on [GitHub](https://github.com/afconwave/sdk-node)
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add new feature'`
4. Push and open a Pull Request

---

## License

MIT © AfconWave
