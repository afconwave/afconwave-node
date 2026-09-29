# @afconwave/sdk — Official Node.js / TypeScript SDK

> The official Node.js and TypeScript client library for the AfconWave Payments API.

## Quick Start

```typescript
import { AfconWave } from '@afconwave/sdk';

const afc = new AfconWave({
  secretKey: 'afc_sk_test_your_key_here',
});
```

Use `afc_sk_test_` keys in sandbox and `afc_sk_live_` in production.

## Webhooks

Always verify HMAC-SHA256 signatures. `verifyWebhookSignature` is timing-safe and rejects payloads older than 5 minutes when a timestamp is present.

Event name may appear as `event` or `type` depending on the emitter — handle both.

## License

See LICENSE in this repository.
