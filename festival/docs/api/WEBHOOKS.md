# Festival Platform - Webhooks Documentation

## Table of Contents

1. [Overview](#overview)
2. [Webhook Events](#webhook-events)
3. [Stripe Webhooks](#stripe-webhooks)
4. [Internal Webhooks](#internal-webhooks)
5. [Security](#security)
6. [Payload Format](#payload-format)
7. [Retry Policy](#retry-policy)
8. [Testing Webhooks](#testing-webhooks)
9. [Best Practices](#best-practices)

---

## Overview

Webhooks allow your application to receive real-time notifications when events occur in the Festival Platform. Instead of polling the API, webhooks push data to your endpoint as soon as events happen.

### How Webhooks Work

```
1. Event occurs (e.g., payment completed)
2. Platform creates webhook payload
3. Platform signs the payload
4. Platform sends POST request to your endpoint
5. Your server verifies signature
6. Your server processes the event
7. Your server returns 2xx response
```

### Supported Webhook Types

| Type | Description |
|------|-------------|
| **Stripe Webhooks** | Payment and refund events from Stripe |
| **Festival Webhooks** | Festival status changes |
| **Ticket Webhooks** | Ticket purchases, validations, cancellations |
| **Cashless Webhooks** | Top-ups, payments, transfers |
| **Notification Webhooks** | Broadcast to external systems |

---

## Webhook Events

### Payment Events

| Event | Description |
|-------|-------------|
| `payment.completed` | Payment successfully processed |
| `payment.failed` | Payment failed |
| `payment.refunded` | Payment refunded |
| `payment.partially_refunded` | Partial refund processed |
| `payment.disputed` | Payment dispute opened |

### Ticket Events

| Event | Description |
|-------|-------------|
| `ticket.purchased` | Ticket successfully purchased |
| `ticket.validated` | Ticket scanned/validated at entry |
| `ticket.cancelled` | Ticket cancelled |
| `ticket.transferred` | Ticket transferred to another user |
| `ticket.reminder` | Ticket reminder sent (1 day before) |

### Cashless Events

| Event | Description |
|-------|-------------|
| `cashless.topup` | Balance topped up |
| `cashless.payment` | Cashless payment made |
| `cashless.refund` | Cashless refund processed |
| `cashless.transfer` | Balance transferred between accounts |
| `cashless.low_balance` | Balance below threshold |

### Festival Events

| Event | Description |
|-------|-------------|
| `festival.published` | Festival published |
| `festival.started` | Festival started (based on start date) |
| `festival.ended` | Festival ended (based on end date) |
| `festival.cancelled` | Festival cancelled |
| `festival.capacity_alert` | Nearing capacity limit |

### Zone Events

| Event | Description |
|-------|-------------|
| `zone.entry` | Person entered zone |
| `zone.exit` | Person exited zone |
| `zone.capacity_reached` | Zone at full capacity |
| `zone.alert` | Security alert in zone |

---

## Stripe Webhooks

### Configuration

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://api.festival-platform.com/api/webhooks/stripe`
3. Select events to listen to
4. Copy the webhook signing secret

### Supported Stripe Events

```
checkout.session.completed
checkout.session.expired
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.canceled
charge.refunded
charge.dispute.created
charge.dispute.closed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

### Webhook Endpoint

```
POST /api/webhooks/stripe
```

### Headers Required

```
Content-Type: application/json
Stripe-Signature: t=1704200400,v1=abc123...,v0=...
```

### Example: checkout.session.completed

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_1234567890",
      "object": "checkout.session",
      "amount_total": 5000,
      "currency": "eur",
      "customer": "cus_1234567890",
      "customer_email": "user@example.com",
      "metadata": {
        "festivalId": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "550e8400-e29b-41d4-a716-446655440001",
        "type": "ticket_purchase",
        "ticketCategoryId": "550e8400-e29b-41d4-a716-446655440002",
        "quantity": "2"
      },
      "payment_intent": "pi_1234567890",
      "payment_status": "paid",
      "status": "complete"
    }
  },
  "created": 1704200400,
  "livemode": false
}
```

### Processing Logic

```typescript
// Stripe webhook handler pseudocode
async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const { type, festivalId, userId } = session.metadata;

      if (type === 'ticket_purchase') {
        await fulfillTicketPurchase(session);
      } else if (type === 'cashless_topup') {
        await fulfillCashlessTopup(session);
      }
      break;

    case 'charge.refunded':
      await processRefund(event.data.object);
      break;

    case 'charge.dispute.created':
      await handleDispute(event.data.object);
      break;
  }
}
```

### Verifying Stripe Signatures

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function verifyStripeWebhook(
  payload: Buffer,
  signature: string
): Promise<Stripe.Event> {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
}
```

---

## Internal Webhooks

### Configuring Webhook Endpoints

Organizers can configure webhook endpoints for their festivals:

```
POST /api/festivals/:id/webhooks
```

```json
{
  "url": "https://your-server.com/webhooks/festival",
  "secret": "your_webhook_secret",
  "events": [
    "ticket.purchased",
    "ticket.validated",
    "cashless.topup",
    "cashless.payment"
  ],
  "enabled": true
}
```

### Webhook Endpoint Requirements

Your endpoint must:
- Accept POST requests
- Return 2xx status within 30 seconds
- Handle duplicate events (idempotency)
- Verify webhook signatures

### Example Webhook Payload

```json
{
  "id": "whk_1234567890abcdef",
  "type": "ticket.purchased",
  "created": "2025-01-02T12:00:00.000Z",
  "festivalId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "ticketId": "550e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440002",
    "categoryId": "550e8400-e29b-41d4-a716-446655440003",
    "categoryName": "3-Day Pass",
    "quantity": 2,
    "totalAmount": 30000,
    "currency": "EUR",
    "purchasedAt": "2025-01-02T12:00:00.000Z"
  }
}
```

---

## Security

### Signature Verification

All webhooks include a signature in the `X-Webhook-Signature` header:

```
X-Webhook-Signature: t=1704200400,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
```

#### Signature Format

```
t=<timestamp>,v1=<signature>
```

- `t`: Unix timestamp when the webhook was sent
- `v1`: HMAC-SHA256 signature

#### Verification Steps

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  header: string,
  secret: string,
  tolerance: number = 300 // 5 minutes
): boolean {
  // Parse header
  const parts = header.split(',');
  const timestamp = parseInt(parts[0].split('=')[1]);
  const signature = parts[1].split('=')[1];

  // Check timestamp tolerance (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    throw new Error('Webhook timestamp too old');
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Security Best Practices

1. **Always verify signatures** - Never process unverified webhooks
2. **Use HTTPS** - Only accept webhooks over HTTPS
3. **Check timestamps** - Reject old webhooks (>5 minutes)
4. **Implement idempotency** - Handle duplicate events gracefully
5. **Store secrets securely** - Use environment variables or secrets manager
6. **Log webhook events** - Keep audit trail for debugging

---

## Payload Format

### Common Fields

All webhook payloads include:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique webhook event ID |
| `type` | string | Event type |
| `created` | string | ISO 8601 timestamp |
| `festivalId` | string | Associated festival ID |
| `data` | object | Event-specific data |

### Event-Specific Payloads

#### ticket.purchased

```json
{
  "id": "whk_ticket_123",
  "type": "ticket.purchased",
  "created": "2025-01-02T12:00:00.000Z",
  "festivalId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "ticketId": "tkt_123456",
    "userId": "usr_123456",
    "userEmail": "user@example.com",
    "userName": "John Doe",
    "category": {
      "id": "cat_123456",
      "name": "VIP 3-Day Pass",
      "type": "VIP"
    },
    "quantity": 1,
    "totalAmount": 29900,
    "currency": "EUR",
    "paymentId": "pay_123456",
    "qrCode": "QR_TICKET_123456_HMAC",
    "purchasedAt": "2025-01-02T12:00:00.000Z"
  }
}
```

#### ticket.validated

```json
{
  "id": "whk_validate_123",
  "type": "ticket.validated",
  "created": "2025-07-15T14:30:00.000Z",
  "festivalId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "ticketId": "tkt_123456",
    "userId": "usr_123456",
    "zone": {
      "id": "zone_123456",
      "name": "Main Entrance",
      "type": "ENTRANCE"
    },
    "validatedBy": {
      "staffId": "staff_123456",
      "name": "Staff Member"
    },
    "validationType": "ENTRY",
    "validatedAt": "2025-07-15T14:30:00.000Z"
  }
}
```

#### cashless.topup

```json
{
  "id": "whk_topup_123",
  "type": "cashless.topup",
  "created": "2025-01-02T12:00:00.000Z",
  "festivalId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "accountId": "csh_123456",
    "userId": "usr_123456",
    "amount": 5000,
    "currency": "EUR",
    "previousBalance": 2500,
    "newBalance": 7500,
    "paymentMethod": "card",
    "paymentId": "pay_123456",
    "topupAt": "2025-01-02T12:00:00.000Z"
  }
}
```

#### cashless.payment

```json
{
  "id": "whk_payment_123",
  "type": "cashless.payment",
  "created": "2025-07-15T18:30:00.000Z",
  "festivalId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "transactionId": "txn_123456",
    "accountId": "csh_123456",
    "userId": "usr_123456",
    "amount": 850,
    "currency": "EUR",
    "previousBalance": 7500,
    "newBalance": 6650,
    "vendor": {
      "id": "vnd_123456",
      "name": "Food Stand #5",
      "type": "FOOD"
    },
    "items": [
      {
        "name": "Burger",
        "quantity": 1,
        "unitPrice": 650
      },
      {
        "name": "Beer",
        "quantity": 1,
        "unitPrice": 200
      }
    ],
    "paidAt": "2025-07-15T18:30:00.000Z"
  }
}
```

---

## Retry Policy

If your endpoint doesn't respond with a 2xx status, we'll retry the webhook:

### Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 minute |
| 2nd retry | 5 minutes |
| 3rd retry | 30 minutes |
| 4th retry | 2 hours |
| 5th retry | 24 hours |

After 5 failed attempts, the webhook is marked as failed and no further retries are attempted.

### Retry Headers

Retried webhooks include:

```
X-Webhook-Retry-Count: 2
X-Webhook-Original-Timestamp: 2025-01-02T12:00:00.000Z
```

### Handling Retries

Your endpoint should be **idempotent**. Use the webhook `id` to detect duplicates:

```typescript
async function handleWebhook(payload: WebhookPayload) {
  // Check if already processed
  const existing = await db.webhookEvents.findUnique({
    where: { webhookId: payload.id }
  });

  if (existing) {
    // Already processed, return success
    return { status: 'already_processed' };
  }

  // Process the webhook
  await processWebhookEvent(payload);

  // Mark as processed
  await db.webhookEvents.create({
    data: {
      webhookId: payload.id,
      type: payload.type,
      processedAt: new Date()
    }
  });

  return { status: 'processed' };
}
```

---

## Testing Webhooks

### Stripe CLI (Local Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3333/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger charge.refunded
```

### Webhook Testing Endpoint

For development, use the test endpoint:

```
POST /api/webhooks/test
```

```json
{
  "url": "https://your-server.com/webhooks",
  "event": "ticket.purchased",
  "data": {
    "ticketId": "test_123",
    "quantity": 1
  }
}
```

### ngrok for Local Testing

```bash
# Expose local server
ngrok http 3333

# Use the ngrok URL for Stripe webhooks
# https://abc123.ngrok.io/api/webhooks/stripe
```

### Webhook Event Log

View recent webhook deliveries in the admin dashboard:

```
GET /api/admin/webhooks/logs
```

Response:
```json
{
  "data": [
    {
      "id": "whk_123",
      "type": "ticket.purchased",
      "url": "https://example.com/webhook",
      "status": "delivered",
      "statusCode": 200,
      "attempts": 1,
      "createdAt": "2025-01-02T12:00:00.000Z",
      "deliveredAt": "2025-01-02T12:00:01.000Z"
    }
  ]
}
```

---

## Best Practices

### 1. Respond Quickly

Return a 2xx response as soon as you receive the webhook. Process the event asynchronously:

```typescript
app.post('/webhooks', async (req, res) => {
  // Verify signature first
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  // Acknowledge receipt immediately
  res.status(200).send('OK');

  // Process asynchronously
  processWebhookAsync(req.body).catch(err => {
    console.error('Webhook processing failed:', err);
  });
});
```

### 2. Handle Duplicates

Webhooks may be delivered multiple times. Use the event ID for idempotency:

```typescript
const processedEvents = new Set();

async function handleWebhook(event) {
  if (processedEvents.has(event.id)) {
    return; // Already processed
  }

  await processEvent(event);
  processedEvents.add(event.id);
}
```

### 3. Log Everything

Keep detailed logs for debugging:

```typescript
async function handleWebhook(event) {
  console.log(`[Webhook] Received: ${event.type} - ${event.id}`);

  try {
    await processEvent(event);
    console.log(`[Webhook] Processed: ${event.id}`);
  } catch (err) {
    console.error(`[Webhook] Failed: ${event.id}`, err);
    throw err;
  }
}
```

### 4. Use a Queue

For high-volume webhooks, use a message queue:

```typescript
import { Queue } from 'bullmq';

const webhookQueue = new Queue('webhooks');

app.post('/webhooks', async (req, res) => {
  // Add to queue
  await webhookQueue.add('process', req.body);
  res.status(200).send('Queued');
});

// Process in worker
webhookQueue.process('process', async (job) => {
  await handleWebhook(job.data);
});
```

### 5. Monitor Failures

Set up alerts for webhook failures:

```typescript
async function handleWebhookFailure(event, error) {
  // Log to monitoring service
  await sentry.captureException(error, {
    extra: { webhookId: event.id, type: event.type }
  });

  // Send alert if critical
  if (isCriticalEvent(event.type)) {
    await sendAlert(`Webhook failed: ${event.type}`);
  }
}
```

---

## Support

- **Documentation**: https://docs.festival-platform.com/webhooks
- **Status Page**: https://status.festival-platform.com
- **Email**: webhooks@festival-platform.com
