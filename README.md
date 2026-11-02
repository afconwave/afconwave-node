# @afconwave/sdk

Official **Node.js / TypeScript SDK** for [AfconWave API v2](https://github.com/afconwave/afconwave-api).

Keys: `afcw_test_…` (sandbox, no live rails) · `afcw_live_…` (production, KYB required)  
Auth header: `X-API-Key`  
Ledger refs: `AFCW-IN-…` / `AFCW-OUT-…` / `P2P-…` / `FX-…`

```bash
npm install @afconwave/sdk
```

## Quick start

```typescript
import { AfconWave } from '@afconwave/sdk';

const afc = new AfconWave({
  secretKey: process.env.AFCONWAVE_SECRET_KEY!, // afcw_test_... or afcw_live_...
});

// Collection (deposit / pay-in)
const deposit = await afc.deposits.create({
  amount: 5000,
  country_code: 'CM',
  currency: 'XAF',
  payment_method: 'MTN',
  mobile: '670000000',
  mode: 'direct',
  idempotency_key: 'order-12345',
});

// Payout (withdrawal)
const payout = await afc.withdrawals.create({
  amount: 2000,
  currency: 'XAF',
  country_code: 'CM',
  payment_method: 'MTN',
  beneficiary_name: 'Jane Doe',
  mobile_no: '670000001',
  idempotency_key: 'payout-order-99',
});

// Balances
const wallets = await afc.wallets.list();

// P2P transfer
await afc.wallets.transfer({
  amount: 1000,
  currency: 'XAF',
  to_email: 'peer@example.com',
  idempotency_key: 'p2p-abc',
});
```

## Auth

| Key prefix        | Behaviour                                      |
|-------------------|------------------------------------------------|
| `afcw_test_`      | Sandbox — magic numbers, zero provider traffic |
| `afcw_live_`      | Live rails (business must be KYB verified)     |

Send the key as `X-API-Key`. JWT Bearer is only for dashboard users, not this SDK.

## Sandbox magic numbers

| Pattern              | Outcome   |
|----------------------|-----------|
| Amount ending `13`   | failed    |
| Amount ending `99`   | pending   |
| Mobile / account `0000000000` | failed |
| Mobile / account `1111111111` | pending |

## Main resources

| Resource | Methods |
|----------|---------|
| `deposits` | `create`, `retrieve`, `list`, `sync` |
| `withdrawals` | `create`, `list`, `sync`, `methods`, `nigeriaBanks` |
| `wallets` | `list`, `ensure`, `convert`, `transfer`, `rates` |
| `transactions` | `list`, `retrieve`, `recent` |
| `refunds` | `create`, `list` |
| `disputes` | `open`, `list` |
| `airtime` / `data` | `purchase` |
| `paymentLinks` | `create`, `list` |
| `rails` | `payoutMethods` |

Idempotency: pass `idempotency_key` in the body **or** header `Idempotency-Key`. Replays return the original response with `duplicate: true`.

## Webhook verification

```typescript
import { verifyWebhookSignature } from '@afconwave/sdk';

const ok = verifyWebhookSignature({
  payload: rawBody,
  signature: req.headers['x-webhook-signature'] as string,
  secret: process.env.WEBHOOK_SECRET!,
  // Swychr-style: HMAC(timestamp + '.' + body)
  timestampPrefixed: true,
  timestamp: req.headers['x-webhook-timestamp'] as string,
});
```

## Breaking changes from 1.x

- Auth is **`X-API-Key`**, not `Authorization: Bearer`.
- Base path is `/v1` (legacy `/api/v1` still rewritten server-side).
- `payments` → **`deposits`**; `payouts` → **`withdrawals`**.
- Request shapes require `country_code`, corridor `payment_method`, etc.
- Response uses `reference` (`AFCW-IN-…`) instead of opaque payment ids in many places.

## License

MIT
