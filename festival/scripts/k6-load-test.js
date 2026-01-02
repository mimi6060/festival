/**
 * k6 Load Testing Script for Festival API
 *
 * More sophisticated load testing using k6.
 *
 * Installation:
 *   brew install k6  (macOS)
 *   choco install k6 (Windows)
 *
 * Usage:
 *   k6 run scripts/k6-load-test.js
 *   k6 run --vus 100 --duration 60s scripts/k6-load-test.js
 *   k6 run --out json=results.json scripts/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const ticketPurchases = new Counter('ticket_purchases');
const cashlessTopups = new Counter('cashless_topups');
const zoneScans = new Counter('zone_scans');
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Test configuration
export const options = {
  // Stages define the load profile
  stages: [
    // Ramp up to 50 users over 30 seconds
    { duration: '30s', target: 50 },
    // Stay at 50 users for 1 minute
    { duration: '1m', target: 50 },
    // Ramp up to 200 users over 30 seconds
    { duration: '30s', target: 200 },
    // Stay at 200 users for 2 minutes (peak load)
    { duration: '2m', target: 200 },
    // Spike to 500 users for 30 seconds (stress test)
    { duration: '30s', target: 500 },
    // Ramp down to 50 users
    { duration: '30s', target: 50 },
    // Stay at 50 users for 1 minute
    { duration: '1m', target: 50 },
    // Ramp down to 0
    { duration: '30s', target: 0 },
  ],

  // Thresholds define pass/fail criteria
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    errors: ['rate<0.05'], // Custom error rate < 5%
    api_latency: ['p(95)<400'], // API latency p95 < 400ms
  },
};

// Default headers
const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...(AUTH_TOKEN && { Authorization: `Bearer ${AUTH_TOKEN}` }),
};

// Test data
const festivalIds = ['festival-1', 'festival-2', 'festival-3'];
const ticketTypes = ['STANDARD', 'VIP', 'BACKSTAGE', 'CAMPING'];
const zoneIds = ['zone-main', 'zone-vip', 'zone-food', 'zone-camping'];

/**
 * Setup function - runs once before tests
 */
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);

  // Verify API is accessible
  const res = http.get(`${BASE_URL}/api/health`, { headers });
  check(res, {
    'API is accessible': (r) => r.status === 200,
  });

  return {
    startTime: new Date().toISOString(),
  };
}

/**
 * Main test function - runs for each virtual user
 */
export default function (data) {
  // Simulate realistic user behavior with weighted scenarios
  const scenario = randomIntBetween(1, 100);

  if (scenario <= 40) {
    // 40% - Browse festivals and view details
    browsingScenario();
  } else if (scenario <= 60) {
    // 20% - Check ticket status and validate
    ticketScenario();
  } else if (scenario <= 80) {
    // 20% - Cashless operations
    cashlessScenario();
  } else if (scenario <= 95) {
    // 15% - Zone access and capacity checks
    zoneScenario();
  } else {
    // 5% - Analytics and reports (admin)
    analyticsScenario();
  }

  // Random think time between 1-3 seconds
  sleep(randomIntBetween(1, 3));
}

/**
 * Browsing scenario - viewing festivals and details
 */
function browsingScenario() {
  group('Browsing', () => {
    // List festivals
    let res = http.get(`${BASE_URL}/api/festivals?status=PUBLISHED&limit=20`, { headers });
    const listSuccess = check(res, {
      'list festivals - status 200': (r) => r.status === 200,
      'list festivals - has data': (r) => JSON.parse(r.body).data !== undefined,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(!listSuccess);

    if (listSuccess) {
      // View festival details
      const festivalId = randomItem(festivalIds);
      res = http.get(`${BASE_URL}/api/festivals/${festivalId}`, { headers });
      check(res, {
        'festival details - status 200 or 404': (r) => [200, 404].includes(r.status),
      });
      apiLatency.add(res.timings.duration);
    }

    // View vendors
    res = http.get(`${BASE_URL}/api/vendors?limit=10`, { headers });
    check(res, {
      'list vendors - status 200': (r) => r.status === 200,
    });
    apiLatency.add(res.timings.duration);

    // View program/artists
    const festivalId = randomItem(festivalIds);
    res = http.get(`${BASE_URL}/api/festivals/${festivalId}/program`, { headers });
    check(res, {
      'festival program - status 200 or 404': (r) => [200, 404].includes(r.status),
    });
    apiLatency.add(res.timings.duration);
  });
}

/**
 * Ticket scenario - checking and validating tickets
 */
function ticketScenario() {
  group('Tickets', () => {
    // Check user tickets
    let res = http.get(`${BASE_URL}/api/tickets/me?limit=10`, { headers });
    const ticketCheck = check(res, {
      'user tickets - status 200 or 401': (r) => [200, 401].includes(r.status),
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(!ticketCheck && res.status !== 401);

    // Simulate ticket validation (QR scan)
    const festivalId = randomItem(festivalIds);
    const mockQrCode = `TICKET-${Date.now()}-${randomIntBetween(1000, 9999)}`;

    res = http.post(
      `${BASE_URL}/api/tickets/validate`,
      JSON.stringify({
        festivalId,
        qrCode: mockQrCode,
      }),
      { headers }
    );
    check(res, {
      'ticket validation - valid response': (r) => [200, 400, 401, 404].includes(r.status),
    });
    apiLatency.add(res.timings.duration);
    ticketPurchases.add(1);
  });
}

/**
 * Cashless scenario - balance checks and payments
 */
function cashlessScenario() {
  group('Cashless', () => {
    // Check balance
    let res = http.get(`${BASE_URL}/api/cashless/balance`, { headers });
    const balanceCheck = check(res, {
      'cashless balance - status 200 or 401': (r) => [200, 401].includes(r.status),
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(!balanceCheck && res.status !== 401);

    // Get transaction history
    res = http.get(`${BASE_URL}/api/cashless/transactions?limit=20`, { headers });
    check(res, {
      'transaction history - valid response': (r) => [200, 401].includes(r.status),
    });
    apiLatency.add(res.timings.duration);

    // Simulate topup request
    const topupAmount = randomItem([10, 20, 50, 100]);
    res = http.post(
      `${BASE_URL}/api/cashless/topup`,
      JSON.stringify({
        amount: topupAmount,
        currency: 'EUR',
      }),
      { headers }
    );
    check(res, {
      'cashless topup - valid response': (r) => [200, 201, 400, 401].includes(r.status),
    });
    apiLatency.add(res.timings.duration);
    cashlessTopups.add(1);
  });
}

/**
 * Zone scenario - access control and capacity
 */
function zoneScenario() {
  group('Zones', () => {
    const festivalId = randomItem(festivalIds);
    const zoneId = randomItem(zoneIds);

    // Check zone capacity (real-time critical)
    let res = http.get(`${BASE_URL}/api/zones/festival/${festivalId}/capacity`, { headers });
    const capacityCheck = check(res, {
      'zone capacity - status 200 or 404': (r) => [200, 404].includes(r.status),
      'zone capacity - fast response': (r) => r.timings.duration < 200,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(!capacityCheck && res.status !== 404);

    // Get single zone status
    res = http.get(`${BASE_URL}/api/zones/${zoneId}/status`, { headers });
    check(res, {
      'zone status - valid response': (r) => [200, 404].includes(r.status),
    });
    apiLatency.add(res.timings.duration);

    // Simulate zone access scan
    const mockTicketId = `ticket-${Date.now()}-${randomIntBetween(1000, 9999)}`;
    res = http.post(
      `${BASE_URL}/api/zones/${zoneId}/access`,
      JSON.stringify({
        ticketId: mockTicketId,
        action: 'ENTRY',
      }),
      { headers }
    );
    check(res, {
      'zone access - valid response': (r) => [200, 400, 401, 403, 404].includes(r.status),
    });
    apiLatency.add(res.timings.duration);
    zoneScans.add(1);
  });
}

/**
 * Analytics scenario - dashboard and reports
 */
function analyticsScenario() {
  group('Analytics', () => {
    const festivalId = randomItem(festivalIds);

    // Dashboard KPIs (heavy query)
    let res = http.get(`${BASE_URL}/api/analytics/dashboard?festivalId=${festivalId}`, { headers });
    check(res, {
      'dashboard KPIs - status 200 or 401/403': (r) => [200, 401, 403].includes(r.status),
      'dashboard KPIs - reasonable time': (r) => r.timings.duration < 2000,
    });
    apiLatency.add(res.timings.duration);

    // Sales analytics
    res = http.get(`${BASE_URL}/api/analytics/sales?festivalId=${festivalId}`, { headers });
    check(res, {
      'sales analytics - valid response': (r) => [200, 401, 403].includes(r.status),
    });
    apiLatency.add(res.timings.duration);

    // Real-time analytics
    res = http.get(`${BASE_URL}/api/analytics/realtime?festivalId=${festivalId}`, { headers });
    check(res, {
      'realtime analytics - valid response': (r) => [200, 401, 403].includes(r.status),
      'realtime analytics - fast response': (r) => r.timings.duration < 500,
    });
    apiLatency.add(res.timings.duration);
  });
}

/**
 * Teardown function - runs once after tests
 */
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
}

/**
 * Handle test summary
 */
export function handleSummary(data) {
  console.log('\n=== LOAD TEST SUMMARY ===\n');

  // Custom summary output
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs / 1000,
    vus: {
      min: data.metrics.vus?.values?.min || 0,
      max: data.metrics.vus?.values?.max || 0,
    },
    requests: {
      total: data.metrics.http_reqs?.values?.count || 0,
      rate: data.metrics.http_reqs?.values?.rate || 0,
    },
    latency: {
      avg: data.metrics.http_req_duration?.values?.avg || 0,
      p50: data.metrics.http_req_duration?.values['p(50)'] || 0,
      p95: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99: data.metrics.http_req_duration?.values['p(99)'] || 0,
      max: data.metrics.http_req_duration?.values?.max || 0,
    },
    errors: {
      rate: data.metrics.http_req_failed?.values?.rate || 0,
      count: data.metrics.http_req_failed?.values?.passes || 0,
    },
    custom: {
      ticketPurchases: data.metrics.ticket_purchases?.values?.count || 0,
      cashlessTopups: data.metrics.cashless_topups?.values?.count || 0,
      zoneScans: data.metrics.zone_scans?.values?.count || 0,
    },
    thresholds: data.thresholds,
  };

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(summary, null, 2),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options || {};

  const lines = [];
  lines.push(`${indent}=== Performance Test Results ===`);
  lines.push(`${indent}Duration: ${(data.state.testRunDurationMs / 1000).toFixed(1)}s`);
  lines.push(`${indent}VUs: min=${data.metrics.vus?.values?.min || 0}, max=${data.metrics.vus?.values?.max || 0}`);
  lines.push('');
  lines.push(`${indent}HTTP Requests:`);
  lines.push(`${indent}  Total: ${data.metrics.http_reqs?.values?.count || 0}`);
  lines.push(`${indent}  Rate: ${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s`);
  lines.push('');
  lines.push(`${indent}Latency (http_req_duration):`);
  lines.push(`${indent}  avg: ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`);
  lines.push(`${indent}  p50: ${(data.metrics.http_req_duration?.values['p(50)'] || 0).toFixed(2)}ms`);
  lines.push(`${indent}  p95: ${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms`);
  lines.push(`${indent}  p99: ${(data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms`);
  lines.push(`${indent}  max: ${(data.metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms`);
  lines.push('');
  lines.push(`${indent}Errors:`);
  lines.push(`${indent}  Rate: ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`);
  lines.push('');
  lines.push(`${indent}Business Metrics:`);
  lines.push(`${indent}  Ticket Operations: ${data.metrics.ticket_purchases?.values?.count || 0}`);
  lines.push(`${indent}  Cashless Topups: ${data.metrics.cashless_topups?.values?.count || 0}`);
  lines.push(`${indent}  Zone Scans: ${data.metrics.zone_scans?.values?.count || 0}`);

  return lines.join('\n');
}
