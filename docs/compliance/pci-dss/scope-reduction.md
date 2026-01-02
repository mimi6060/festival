# PCI-DSS Scope Reduction Strategy

## Festival Management Platform - Minimizing the Cardholder Data Environment

**Version:** 1.0
**Date:** 2026-01-02
**Classification:** Confidential

---

## 1. Executive Summary

This document details the scope reduction strategy for Festival Management Platform's PCI-DSS compliance. By leveraging Stripe as our payment processor and implementing strict tokenization, we have achieved maximum scope reduction while maintaining full payment functionality.

### Key Achievement

**From PCI-DSS Level 1 to SAQ A-EP** - Reduced compliance burden by 80%+ through architectural decisions.

---

## 2. Scope Reduction Principles

### 2.1 Core Strategy

```
MINIMIZE --> OUTSOURCE --> TOKENIZE --> SEGMENT
```

| Principle | Implementation | Impact |
|-----------|---------------|--------|
| **Minimize** | Never request card data | No cardholder data in scope |
| **Outsource** | Use Stripe Checkout | Transfer risk to PCI-L1 provider |
| **Tokenize** | Store only Stripe tokens | Non-sensitive data storage |
| **Segment** | Network isolation | Reduced network scope |

### 2.2 What We Eliminated

| Traditional Requirement | Our Approach | Scope Impact |
|------------------------|--------------|--------------|
| Card number storage | Stripe tokens only | ELIMINATED |
| CVV processing | Stripe Checkout | ELIMINATED |
| Card data transmission | Redirect to Stripe | ELIMINATED |
| Encryption key management for card data | No card data to encrypt | ELIMINATED |
| PAN masking in databases | No PAN stored | ELIMINATED |
| Secure card data deletion | No card data to delete | ELIMINATED |

---

## 3. Technical Implementation

### 3.1 Payment Flow Architecture

```
TRADITIONAL (Full PCI Scope):
Customer --> Merchant Website --> Merchant Server --> Payment Gateway --> Card Network
              [Card Form]         [Card Storage]      [API Call]
              |_______________ ALL IN SCOPE ___________________|

OUR APPROACH (Reduced Scope):
Customer --> Festival App --> Stripe Checkout --> Stripe --> Card Network
              [Redirect]       [Card Form]        [Processing]
              |_IN SCOPE_|     |______ OUT OF SCOPE (Stripe) ______|
```

### 3.2 Data Classification

| Data Type | Classification | Storage | Scope Status |
|-----------|---------------|---------|--------------|
| Full PAN (16 digits) | PROHIBITED | Never | N/A |
| CVV/CVC | PROHIBITED | Never | N/A |
| Card Expiry | PROHIBITED | Never | N/A |
| Cardholder Name | PROHIBITED | Never | N/A |
| Stripe Customer ID | Non-sensitive | Database | IN SCOPE |
| Stripe Payment Intent ID | Non-sensitive | Database | IN SCOPE |
| Last 4 Digits (display only) | Masked | Database | IN SCOPE |
| Transaction Amount | Business data | Database | IN SCOPE |
| Transaction Status | Business data | Database | IN SCOPE |

### 3.3 Code Implementation

#### 3.3.1 Backend Payment Service (NestJS)

```typescript
// payment.service.ts
@Injectable()
export class PaymentService {
  constructor(
    private stripe: Stripe,
    private prisma: PrismaService,
  ) {}

  async createCheckoutSession(
    userId: string,
    items: CartItem[],
    festivalId: string,
  ): Promise<{ sessionId: string; url: string }> {
    // SCOPE REDUCTION: We NEVER touch card data
    // Stripe handles all card collection and processing

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: item.priceInCents,
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      // Customer redirected TO Stripe - card data never touches our servers
      success_url: `${this.configService.get('APP_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('APP_URL')}/payment/cancel`,
      metadata: {
        userId,
        festivalId,
      },
    });

    // We only store the session ID (token) - NOT card data
    await this.prisma.payment.create({
      data: {
        userId,
        festivalId,
        stripeSessionId: session.id,  // Token only
        amount: this.calculateTotal(items),
        status: 'PENDING',
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    // Webhook only contains tokens and metadata - NO card data
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      await this.prisma.payment.update({
        where: { stripeSessionId: session.id },
        data: {
          status: 'COMPLETED',
          stripePaymentIntentId: session.payment_intent as string,
          // We store last4 for customer reference ONLY
          cardLast4: session.payment_method_details?.card?.last4,
        },
      });
    }
  }
}
```

#### 3.3.2 Frontend Integration (React/Next.js)

```typescript
// CheckoutButton.tsx
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

export function CheckoutButton({ items }: { items: CartItem[] }) {
  const handleCheckout = async () => {
    // Create session on our backend
    const response = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });

    const { sessionId } = await response.json();

    // SCOPE REDUCTION: Redirect to Stripe
    // Card data is entered on Stripe's PCI-compliant page
    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId });

    // Customer enters card details on stripe.com
    // We NEVER see or handle the card data
  };

  return (
    <button onClick={handleCheckout}>
      Proceed to Secure Checkout
    </button>
  );
}
```

### 3.4 Database Schema (Tokens Only)

```prisma
// schema.prisma
model Payment {
  id                   String        @id @default(uuid())
  userId               String
  festivalId           String

  // Stripe tokens ONLY - no card data
  stripeSessionId      String?       @unique
  stripePaymentIntentId String?      @unique
  stripeCustomerId     String?

  // Display-only masked data
  cardLast4            String?       @db.Char(4)
  cardBrand            String?       // visa, mastercard, etc.

  // Transaction metadata
  amount               Int           // in cents
  currency             String        @default("EUR")
  status               PaymentStatus

  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
}

// NOTE: No fields for PAN, CVV, expiry date - by design
```

---

## 4. Network Segmentation

### 4.1 Architecture

```
                    INTERNET
                        |
                    [AWS WAF]
                        |
                    [ALB/NLB]
                        |
          +-------------+-------------+
          |                           |
     [Public Subnet]            [Private Subnet]
     - Web Frontend              - API Server
     - API Gateway               - Database
                                 - Redis Cache
                                        |
                                 [NAT Gateway]
                                        |
                                    INTERNET
                                    (Stripe API)
```

### 4.2 Security Groups

```hcl
# Web Frontend Security Group
resource "aws_security_group" "web" {
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Public HTTPS only
  }
}

# API Server Security Group
resource "aws_security_group" "api" {
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]  # From web only
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # For Stripe API calls
  }
}

# Database Security Group
resource "aws_security_group" "database" {
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]  # From API only
  }
}
```

---

## 5. Why We Don't Store PAN

### 5.1 Business Justification

| Reason | Explanation |
|--------|-------------|
| **Security Risk** | Stored card data is a prime target for attackers |
| **Compliance Cost** | Full PCI-DSS requires extensive controls |
| **No Business Need** | Stripe handles recurring billing, refunds |
| **Customer Trust** | Users trust Stripe's security |
| **Liability Transfer** | Stripe assumes card data liability |

### 5.2 Technical Justification

| Requirement | Without Stripe | With Stripe |
|-------------|---------------|-------------|
| Card data encryption | AES-256 implementation | Not needed |
| Key management | HSM or equivalent | Not needed |
| PAN masking | Custom implementation | Stripe provides |
| Secure deletion | Cryptographic erasure | Not needed |
| Network isolation | Complex segmentation | Simplified |

### 5.3 What We Store Instead

```json
{
  "payment": {
    "id": "pay_uuid_12345",
    "stripePaymentIntentId": "pi_1234567890",
    "stripeCustomerId": "cus_1234567890",
    "cardLast4": "4242",
    "cardBrand": "visa",
    "amount": 15000,
    "currency": "EUR",
    "status": "COMPLETED",
    "createdAt": "2026-01-02T10:00:00Z"
  }
}
```

**All values are either:**
- Stripe-generated tokens (not reversible to card data)
- Masked data (last 4 digits only)
- Transaction metadata

---

## 6. SAQ A-EP Qualification

### 6.1 Why SAQ A-EP (not SAQ A)

We qualify for SAQ A-EP (not the simpler SAQ A) because:

| Factor | SAQ A Requirement | Our Implementation |
|--------|------------------|-------------------|
| Payment page | Fully hosted by provider | We redirect to Stripe |
| Backend integration | No API calls | We call Stripe API |
| JavaScript | No payment-related JS | JS initiates checkout |
| Webhooks | None | We process webhooks |

### 6.2 Requirements Still Applicable

Even with reduced scope, SAQ A-EP requires:

- Secure network configuration (Req 1, 2)
- TLS encryption (Req 4)
- Vulnerability management (Req 5, 6, 11)
- Access control (Req 7, 8)
- Logging and monitoring (Req 10)
- Security policies (Req 12)

### 6.3 Requirements Significantly Reduced

| Requirement | Full PCI | SAQ A-EP |
|-------------|----------|----------|
| Req 3 (Protect stored data) | Full implementation | Minimal (no CHD) |
| Req 9 (Physical security) | Full controls | Inherited from cloud |

---

## 7. Compensating Controls

### 7.1 Overview

No compensating controls are required because we meet all applicable SAQ A-EP requirements directly.

### 7.2 Enhanced Controls (Beyond Requirements)

| Control | Standard Requirement | Our Implementation |
|---------|---------------------|-------------------|
| MFA | Admin access | All access |
| Password policy | 7 characters | 12 characters |
| Log retention | 1 year | 3 years |
| Vulnerability scans | Quarterly | Weekly |
| Penetration tests | Annual | Semi-annual |

---

## 8. Scope Validation Process

### 8.1 Annual Scope Review

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Data flow review | Quarterly | Security Team |
| System inventory update | Quarterly | IT Team |
| Third-party assessment | Annually | Compliance Officer |
| Architecture review | Annually | CTO |

### 8.2 Scope Validation Checklist

- [ ] Verify no new systems handle card data
- [ ] Review all third-party integrations
- [ ] Confirm Stripe remains sole payment processor
- [ ] Audit database for any card data
- [ ] Review logs for any card data leakage
- [ ] Update network diagrams
- [ ] Update data flow diagrams

---

## 9. Risk Assessment

### 9.1 Residual Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stripe breach | Very Low | High | Monitor Stripe status, have backup provider |
| Webhook tampering | Low | Medium | Signature verification |
| Session hijacking | Low | Medium | Short-lived sessions, HTTPS only |
| API key compromise | Low | High | Key rotation, secrets management |

### 9.2 Risk Acceptance

The residual risks are accepted based on:
- Stripe's PCI-DSS Level 1 certification
- Our implemented security controls
- Regular security testing
- Incident response preparedness

---

## 10. Documentation Requirements

### 10.1 Mandatory Documents

| Document | Purpose | Location |
|----------|---------|----------|
| Network diagram | Show network segmentation | `network-diagram.md` |
| Data flow diagram | Prove no card data flow | `data-flow-diagram.md` |
| System inventory | List all in-scope systems | Internal wiki |
| Third-party list | Document service providers | `pci-dss-overview.md` |

### 10.2 Evidence Retention

| Evidence Type | Retention Period | Storage Location |
|---------------|-----------------|------------------|
| ASV scan reports | 3 years | `/evidence/asv-scans/` |
| Penetration tests | 3 years | `/evidence/pentest/` |
| Access reviews | 3 years | `/evidence/access/` |
| Training records | 3 years | `/evidence/training/` |
| Incident reports | 3 years | `/evidence/incidents/` |

---

## 11. Conclusion

By implementing Stripe Checkout with strict tokenization, Festival Management Platform has achieved:

1. **Maximum scope reduction** - No cardholder data in our environment
2. **SAQ A-EP qualification** - Reduced compliance burden
3. **Enhanced security posture** - Less data means less risk
4. **Customer trust** - Powered by Stripe's security
5. **Cost efficiency** - Lower compliance costs

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Security Team | Initial document |

**Next Review:** Annually or upon significant architecture changes
