# Cookie Policy Template

## Festival Management Platform - Cookie and Tracking Technologies

**Document Type:** Master Template
**Version:** 1.0
**Last Updated:** 2026-01-02
**Applicable Regulations:** GDPR, ePrivacy Directive, CCPA, PECR

---

## Quick Links

- [English Version](./cookie-policy-en.md)
- [French Version (Version Francaise)](./cookie-policy-fr.md)

---

## Template Usage Guide

### Purpose

This master template provides the framework for cookie policies across all Festival Management Platform deployments. It documents all cookies and tracking technologies used.

### Customization Required

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `[COMPANY NAME]` | Legal entity | Festival Tech SAS |
| `[DOMAIN]` | Platform domain | festival.com |
| `[URL]` | Full platform URL | https://festival.com |
| `[ANALYTICS_ID]` | Analytics property | GA-XXXXXXX |

---

## Cookie Policy Structure

### 1. Introduction

#### 1.1 What Are Cookies?

Cookies are small text files stored on your device when you visit websites. They help websites remember preferences, login status, and other information to improve your experience.

#### 1.2 Why We Use Cookies

We use cookies to:
- Keep you logged in
- Remember your preferences
- Secure your transactions
- Analyze how you use our Platform
- Improve our services

#### 1.3 Legal Framework

| Regulation | Requirement | Our Approach |
|------------|-------------|--------------|
| GDPR (EU) | Consent for non-essential cookies | Cookie banner with choices |
| ePrivacy Directive | Prior consent | Opt-in for tracking |
| PECR (UK) | Consent requirements | Same as GDPR |
| CCPA (California) | Disclosure of tracking | Full disclosure |

---

### 2. Cookie Categories

#### 2.1 Strictly Necessary Cookies

**These cookies are essential for the Platform to function. They cannot be disabled.**

| Cookie Name | Provider | Purpose | Duration | Data Collected |
|-------------|----------|---------|----------|----------------|
| `session_id` | Festival Platform | Maintains user session | Session | Session identifier |
| `csrf_token` | Festival Platform | CSRF attack prevention | Session | Security token |
| `auth_token` | Festival Platform | User authentication | 7 days | Encrypted JWT |
| `refresh_token` | Festival Platform | Token renewal | 30 days | Encrypted token |
| `cookie_consent` | Festival Platform | Records cookie choices | 1 year | Consent status |
| `locale` | Festival Platform | Language preference | 1 year | Language code (en, fr, etc.) |
| `cart_id` | Festival Platform | Shopping cart | 7 days | Cart identifier |
| `__stripe_mid` | Stripe | Payment fraud prevention | 1 year | Device identifier |
| `__stripe_sid` | Stripe | Payment session | 30 minutes | Session identifier |

**Legal Basis:** Contract performance / Technical necessity

#### 2.2 Analytics Cookies

**These cookies help us understand how visitors use our Platform. Require consent.**

| Cookie Name | Provider | Purpose | Duration | Data Collected |
|-------------|----------|---------|----------|----------------|
| `_ga` | Google Analytics | Distinguishes unique visitors | 13 months | Client ID |
| `_ga_*` | Google Analytics | Persistent session state | 13 months | Session data |
| `_gid` | Google Analytics | Distinguishes users | 24 hours | Client ID |
| `_gat` | Google Analytics | Request rate throttling | 1 minute | None |
| `mp_*` | Mixpanel | User behavior analysis | 1 year | User actions |

**Legal Basis:** Consent (Article 6.1.a GDPR)

**Data Collected:**
- Pages viewed
- Time on page
- Click patterns
- Device type
- Browser type
- Referral source
- Geographic region (country/city level)

**IP Anonymization:** Enabled - last octet masked before storage

#### 2.3 Functional Cookies

**These cookies enable enhanced features and personalization. Require consent.**

| Cookie Name | Provider | Purpose | Duration | Data Collected |
|-------------|----------|---------|----------|----------------|
| `theme` | Festival Platform | UI theme (light/dark) | 1 year | Theme preference |
| `currency` | Festival Platform | Preferred currency | 1 year | Currency code |
| `notifications` | Festival Platform | Notification settings | 1 year | Preference flags |
| `map_view` | Festival Platform | Map display preferences | Session | View settings |
| `last_festival` | Festival Platform | Last viewed festival | 7 days | Festival ID |
| `intercom-*` | Intercom | Support chat state | Session | Chat state |
| `crisp-client/*` | Crisp | Support chat | 6 months | Client ID |

**Legal Basis:** Consent (Article 6.1.a GDPR)

#### 2.4 Advertising/Marketing Cookies

**These cookies are used for advertising purposes. Require explicit consent.**

| Cookie Name | Provider | Purpose | Duration | Data Collected |
|-------------|----------|---------|----------|----------------|
| `_fbp` | Facebook Pixel | Ad conversion tracking | 90 days | Browser ID |
| `_fbc` | Facebook Pixel | Click attribution | 90 days | Click ID |
| `fr` | Facebook | Ad delivery & measurement | 90 days | User ID |
| `IDE` | Google Ads | Conversion tracking | 13 months | Doubleclick ID |
| `NID` | Google | Ad personalization | 6 months | Preference ID |
| `MUID` | Microsoft Bing | Ad analytics | 13 months | User ID |

**Legal Basis:** Consent (Article 6.1.a GDPR)

**Note:** Marketing cookies are only set when:
1. User has given explicit consent
2. Active advertising campaigns are running

---

### 3. Local Storage and Similar Technologies

#### 3.1 Local Storage

| Key | Purpose | Data Stored | Expiration |
|-----|---------|-------------|------------|
| `auth_state` | Auth state management | Token refresh state | Until logout |
| `cart_items` | Persist cart offline | Cart contents | 7 days |
| `user_preferences` | UI preferences | Theme, language | Persistent |
| `offline_data` | Offline mode support | Cached API responses | 24 hours |

#### 3.2 Session Storage

| Key | Purpose | Data Stored |
|-----|---------|-------------|
| `checkout_state` | Multi-step checkout | Current step, selections |
| `search_filters` | Preserve search state | Applied filters |
| `form_drafts` | Auto-save forms | Form field values |

#### 3.3 IndexedDB

| Database | Purpose | Data Stored |
|----------|---------|-------------|
| `festival_cache` | Offline festival data | Festival details, schedules |
| `ticket_cache` | Offline ticket access | QR codes, ticket details |

---

### 4. Mobile Application Tracking

#### 4.1 Mobile Identifiers

| Identifier | Platform | Purpose | Consent Required |
|------------|----------|---------|------------------|
| Device ID | iOS/Android | Push notifications | Yes |
| IDFA | iOS | Advertising | Yes (ATT required) |
| GAID | Android | Advertising | Yes |
| Firebase Instance ID | Both | Analytics/Push | Yes |

#### 4.2 SDK Tracking

| SDK | Purpose | Data Collected | Consent |
|-----|---------|----------------|---------|
| Firebase Analytics | App analytics | Usage patterns | Yes |
| Firebase Crashlytics | Crash reporting | Error data | Legitimate interest |
| Sentry | Error monitoring | Error details | Legitimate interest |
| Stripe SDK | Payments | Payment data | Contract |

---

### 5. Third-Party Cookies

#### 5.1 Payment Providers

| Provider | Cookies | Purpose | More Info |
|----------|---------|---------|-----------|
| Stripe | `__stripe_*` | Payment security | stripe.com/privacy |

**Note:** Payment cookies are essential and do not require consent.

#### 5.2 Support Tools

| Provider | Cookies | Purpose | More Info |
|----------|---------|---------|-----------|
| Intercom | `intercom-*` | Live chat | intercom.com/legal/privacy |
| Crisp | `crisp-*` | Support chat | crisp.chat/privacy |

#### 5.3 Social Media Widgets

| Provider | Widget | Purpose | Consent Required |
|----------|--------|---------|------------------|
| Facebook | Share button | Social sharing | Yes |
| Twitter | Share button | Social sharing | Yes |
| Instagram | Feed embed | Content display | Yes |

**Default State:** Blocked until consent given

---

### 6. Managing Cookie Preferences

#### 6.1 Cookie Consent Banner

On first visit, you'll see a consent banner with options:
- **Accept All** - Enable all cookie categories
- **Reject All** - Only essential cookies
- **Customize** - Choose specific categories

#### 6.2 Updating Preferences

You can change cookie preferences anytime:

| Method | Location |
|--------|----------|
| Cookie settings link | Footer of every page |
| Direct URL | [URL]/cookie-preferences |
| Account settings | Settings > Privacy > Cookies |
| Mobile app | Menu > Settings > Privacy |

#### 6.3 Browser Settings

**Most browsers allow you to:**
- Block all cookies
- Delete existing cookies
- Allow only first-party cookies
- Set per-site preferences

**Browser Cookie Settings:**

| Browser | Instructions |
|---------|--------------|
| Chrome | chrome://settings/cookies |
| Firefox | about:preferences#privacy |
| Safari | Preferences > Privacy |
| Edge | edge://settings/privacy |

**Warning:** Blocking essential cookies may prevent Platform functionality.

---

### 7. Opt-Out Links

#### 7.1 Analytics Opt-Out

| Provider | Opt-Out Link |
|----------|--------------|
| Google Analytics | https://tools.google.com/dlpage/gaoptout |
| Mixpanel | Contact us or account settings |

#### 7.2 Advertising Opt-Out

| Region | Opt-Out Platform |
|--------|------------------|
| Europe | www.youronlinechoices.eu |
| USA | www.aboutads.info/choices |
| Canada | www.youradchoices.ca |
| All | optout.networkadvertising.org |

#### 7.3 Mobile Advertising

**iOS:**
1. Settings > Privacy > Tracking
2. Disable "Allow Apps to Request to Track"

**Android:**
1. Settings > Google > Ads
2. Enable "Opt out of Ads Personalization"

---

### 8. Cookie Retention Periods

| Cookie Type | Maximum Duration | Regulatory Basis |
|-------------|------------------|------------------|
| Session cookies | End of session | Technical necessity |
| Authentication | 30 days max | Security best practice |
| Analytics | 13 months | CNIL recommendation |
| Advertising | 13 months | CNIL recommendation |
| Consent record | 12 months | GDPR documentation |

**Consent Renewal:** Every 12 months

---

### 9. Do Not Track (DNT)

We currently recognize Do Not Track browser signals as follows:

| DNT Signal | Our Response |
|------------|--------------|
| DNT: 1 (enabled) | Analytics cookies not set |
| DNT: 0 (disabled) | Follow consent preferences |
| No DNT header | Follow consent preferences |

---

### 10. International Transfers

Some third-party cookies transfer data internationally:

| Provider | Data Destination | Safeguard |
|----------|------------------|-----------|
| Google Analytics | USA | SCCs + supplementary measures |
| Stripe | USA | PCI-DSS compliance |
| Facebook | USA | SCCs |
| Sentry | USA | SOC 2 certification |

**Supplementary Measures:**
- IP anonymization
- Data minimization
- Encryption in transit

---

### 11. Children and Cookies

Our Platform is intended for users aged 16+.

| Age Group | Cookie Treatment |
|-----------|-----------------|
| 16+ | Standard consent applies |
| Under 16 | Parental consent required |
| Age unknown | Standard consent + age verification |

---

### 12. Cookie Policy Updates

We may update this Cookie Policy to reflect:
- New cookies added
- Cookies removed
- Provider changes
- Regulatory updates

**Notification:**
- Material changes: Website banner + preference reset
- Minor changes: Policy date update only

**Version History:** Available upon request

---

### 13. Contact Information

**Cookie-Related Questions:**
- Email: privacy@[domain].com
- Form: [URL]/contact/privacy

**Data Protection Officer:**
- Email: dpo@[domain].com

**Supervisory Authority:**

For EU:
- CNIL (France): www.cnil.fr
- [Local DPA based on user location]

For UK:
- ICO: www.ico.org.uk

---

## Technical Implementation Guide

### Cookie Consent Implementation

#### Consent Banner HTML Structure

```html
<div id="cookie-consent" role="dialog" aria-labelledby="cookie-title">
  <h2 id="cookie-title">Cookie Preferences</h2>
  <p>We use cookies to enhance your experience...</p>

  <div class="cookie-options">
    <label>
      <input type="checkbox" checked disabled> Essential (required)
    </label>
    <label>
      <input type="checkbox" id="analytics"> Analytics
    </label>
    <label>
      <input type="checkbox" id="functional"> Functional
    </label>
    <label>
      <input type="checkbox" id="advertising"> Advertising
    </label>
  </div>

  <div class="cookie-buttons">
    <button id="accept-all">Accept All</button>
    <button id="reject-all">Essential Only</button>
    <button id="save-preferences">Save Preferences</button>
  </div>
</div>
```

#### Consent Storage Format

```javascript
// Cookie consent stored as JSON
const consent = {
  version: "1.0",
  timestamp: "2026-01-02T12:00:00Z",
  categories: {
    essential: true,  // Always true
    analytics: false,
    functional: true,
    advertising: false
  },
  expires: "2027-01-02T12:00:00Z"
};

// Stored in cookie
document.cookie = `cookie_consent=${btoa(JSON.stringify(consent))}; max-age=31536000; path=/; secure; samesite=strict`;
```

#### Conditional Script Loading

```javascript
// Only load analytics if consented
if (getConsent('analytics')) {
  loadScript('https://www.googletagmanager.com/gtag/js?id=' + GA_ID);
}

// Only load advertising if consented
if (getConsent('advertising')) {
  loadScript('https://connect.facebook.net/en_US/fbevents.js');
}
```

---

## Cookie Audit Checklist

### Quarterly Review

- [ ] Scan all cookies on production site
- [ ] Verify cookie inventory is accurate
- [ ] Check third-party cookie changes
- [ ] Update policy if needed
- [ ] Test consent mechanism
- [ ] Verify opt-out links work

### Tools for Auditing

| Tool | Purpose | URL |
|------|---------|-----|
| Cookiebot | Cookie scanner | cookiebot.com |
| OneTrust | Cookie compliance | onetrust.com |
| Browser DevTools | Manual inspection | Built-in |
| GDPR Scanner | Compliance check | gdpr-scanner.com |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Legal Team | Initial template |

**Annual Review Due:** January 2027

---

## Related Documents

| Document | Purpose | Location |
|----------|---------|----------|
| Privacy Policy | Data protection | docs/legal/PRIVACY_POLICY.md |
| Terms of Service | Service agreement | docs/legal/TERMS_OF_SERVICE.md |
| Consent Records | Proof of consent | Database |
| Cookie Inventory | Complete cookie list | Internal wiki |

---

*This template is provided for guidance and should be reviewed by qualified legal counsel before use.*
