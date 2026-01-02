#!/usr/bin/env npx ts-node

/**
 * Load Testing Script for Festival API
 *
 * This script performs load testing on critical API endpoints
 * to validate performance under high traffic conditions.
 *
 * Usage:
 *   npx ts-node scripts/load-test.ts
 *   npx ts-node scripts/load-test.ts --target http://localhost:3000 --duration 60
 *
 * Requirements:
 *   npm install autocannon --save-dev
 */

import * as http from 'http';
import * as https from 'https';

// Configuration
interface LoadTestConfig {
  baseUrl: string;
  duration: number; // seconds
  connections: number;
  pipelining: number;
  workers: number;
  authToken?: string;
}

// Test result interface
interface TestResult {
  endpoint: string;
  method: string;
  requests: number;
  throughput: number;
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  errors: number;
  timeouts: number;
  statusCodes: Record<number, number>;
}

// Default configuration
const defaultConfig: LoadTestConfig = {
  baseUrl: process.env['API_URL'] || 'http://localhost:3000',
  duration: 30,
  connections: 100,
  pipelining: 10,
  workers: 4,
};

// Parse command line arguments
function parseArgs(): Partial<LoadTestConfig> {
  const args = process.argv.slice(2);
  const config: Partial<LoadTestConfig> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    switch (key) {
      case 'target':
      case 'url':
        config.baseUrl = value;
        break;
      case 'duration':
        config.duration = parseInt(value, 10);
        break;
      case 'connections':
        config.connections = parseInt(value, 10);
        break;
      case 'pipelining':
        config.pipelining = parseInt(value, 10);
        break;
      case 'workers':
        config.workers = parseInt(value, 10);
        break;
      case 'token':
        config.authToken = value;
        break;
    }
  }

  return config;
}

// Simple HTTP client for load testing
class LoadTester {
  private config: LoadTestConfig;
  private results: Map<string, TestResult> = new Map();
  private activeRequests = 0;
  private completedRequests = 0;
  private errors = 0;
  private latencies: number[] = [];
  private statusCodes: Record<number, number> = {};

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  /**
   * Run a single load test
   */
  async runTest(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    headers?: Record<string, string>,
  ): Promise<TestResult> {
    console.log(`\n[TEST] ${method} ${endpoint}`);
    console.log(`  Duration: ${this.config.duration}s`);
    console.log(`  Connections: ${this.config.connections}`);
    console.log(`  Pipelining: ${this.config.pipelining}`);

    // Reset counters
    this.completedRequests = 0;
    this.errors = 0;
    this.latencies = [];
    this.statusCodes = {};

    const url = new URL(endpoint, this.config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const requestOptions: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
        ...(this.config.authToken && { Authorization: `Bearer ${this.config.authToken}` }),
      },
    };

    const startTime = Date.now();
    const endTime = startTime + this.config.duration * 1000;

    // Create connection pool
    const agent = new httpModule.Agent({
      keepAlive: true,
      maxSockets: this.config.connections,
    });
    requestOptions.agent = agent;

    // Run requests
    const makeRequest = (): Promise<void> => {
      return new Promise((resolve) => {
        if (Date.now() >= endTime) {
          resolve();
          return;
        }

        const reqStart = Date.now();
        this.activeRequests++;

        const req = httpModule.request(requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            const latency = Date.now() - reqStart;
            this.latencies.push(latency);
            this.completedRequests++;
            this.activeRequests--;
            this.statusCodes[res.statusCode || 0] = (this.statusCodes[res.statusCode || 0] || 0) + 1;

            // Continue if not done
            if (Date.now() < endTime) {
              makeRequest().then(resolve);
            } else {
              resolve();
            }
          });
        });

        req.on('error', () => {
          this.errors++;
          this.activeRequests--;
          if (Date.now() < endTime) {
            makeRequest().then(resolve);
          } else {
            resolve();
          }
        });

        req.on('timeout', () => {
          this.errors++;
          req.destroy();
        });

        req.setTimeout(5000);

        if (body) {
          req.write(JSON.stringify(body));
        }

        req.end();
      });
    };

    // Start multiple connections
    const promises: Promise<void>[] = [];
    for (let i = 0; i < this.config.connections; i++) {
      promises.push(makeRequest());
    }

    await Promise.all(promises);
    agent.destroy();

    const totalDuration = (Date.now() - startTime) / 1000;

    // Calculate statistics
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const result: TestResult = {
      endpoint,
      method,
      requests: this.completedRequests,
      throughput: Math.round(this.completedRequests / totalDuration),
      latency: {
        avg: Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length || 0),
        p50: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0,
        p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0,
        p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0,
        max: sortedLatencies[sortedLatencies.length - 1] || 0,
      },
      errors: this.errors,
      timeouts: 0,
      statusCodes: { ...this.statusCodes },
    };

    this.results.set(`${method} ${endpoint}`, result);
    this.printResult(result);

    return result;
  }

  /**
   * Print test result
   */
  private printResult(result: TestResult): void {
    console.log(`\n  Results:`);
    console.log(`    Total Requests: ${result.requests}`);
    console.log(`    Throughput: ${result.throughput} req/sec`);
    console.log(`    Latency (avg): ${result.latency.avg}ms`);
    console.log(`    Latency (p50): ${result.latency.p50}ms`);
    console.log(`    Latency (p95): ${result.latency.p95}ms`);
    console.log(`    Latency (p99): ${result.latency.p99}ms`);
    console.log(`    Latency (max): ${result.latency.max}ms`);
    console.log(`    Errors: ${result.errors}`);
    console.log(`    Status Codes: ${JSON.stringify(result.statusCodes)}`);
  }

  /**
   * Print summary of all tests
   */
  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('LOAD TEST SUMMARY');
    console.log('='.repeat(60));

    const results = Array.from(this.results.values());

    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`Total Requests: ${results.reduce((sum, r) => sum + r.requests, 0)}`);
    console.log(`Total Errors: ${results.reduce((sum, r) => sum + r.errors, 0)}`);

    console.log('\n| Endpoint | Req/sec | Avg (ms) | P95 (ms) | P99 (ms) | Errors |');
    console.log('|----------|---------|----------|----------|----------|--------|');

    for (const result of results) {
      const endpoint = `${result.method} ${result.endpoint}`.substring(0, 30);
      console.log(
        `| ${endpoint.padEnd(30)} | ${result.throughput.toString().padStart(7)} | ` +
          `${result.latency.avg.toString().padStart(8)} | ${result.latency.p95.toString().padStart(8)} | ` +
          `${result.latency.p99.toString().padStart(8)} | ${result.errors.toString().padStart(6)} |`,
      );
    }

    // Performance recommendations
    console.log('\n' + '='.repeat(60));
    console.log('PERFORMANCE RECOMMENDATIONS');
    console.log('='.repeat(60));

    for (const result of results) {
      const issues: string[] = [];

      if (result.latency.avg > 200) {
        issues.push(`High average latency (${result.latency.avg}ms > 200ms)`);
      }
      if (result.latency.p95 > 500) {
        issues.push(`High P95 latency (${result.latency.p95}ms > 500ms)`);
      }
      if (result.latency.p99 > 1000) {
        issues.push(`High P99 latency (${result.latency.p99}ms > 1000ms)`);
      }
      if (result.errors > result.requests * 0.01) {
        issues.push(`High error rate (${((result.errors / result.requests) * 100).toFixed(2)}%)`);
      }

      if (issues.length > 0) {
        console.log(`\n${result.method} ${result.endpoint}:`);
        issues.forEach((issue) => console.log(`  - ${issue}`));
      }
    }

    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
    const avgLatency = results.reduce((sum, r) => sum + r.latency.avg, 0) / results.length;

    console.log('\n' + '='.repeat(60));
    console.log('OVERALL METRICS');
    console.log('='.repeat(60));
    console.log(`Average Throughput: ${Math.round(avgThroughput)} req/sec`);
    console.log(`Average Latency: ${Math.round(avgLatency)}ms`);

    // Grade the performance
    let grade = 'A';
    if (avgLatency > 100 || avgThroughput < 500) grade = 'B';
    if (avgLatency > 200 || avgThroughput < 200) grade = 'C';
    if (avgLatency > 500 || avgThroughput < 100) grade = 'D';
    if (avgLatency > 1000 || avgThroughput < 50) grade = 'F';

    console.log(`Performance Grade: ${grade}`);
  }

  /**
   * Get results as JSON
   */
  getResults(): TestResult[] {
    return Array.from(this.results.values());
  }
}

// Define test scenarios
interface TestScenario {
  name: string;
  endpoint: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
}

const testScenarios: TestScenario[] = [
  // Health & Status endpoints (should be very fast)
  {
    name: 'Health Check',
    endpoint: '/api/health',
    method: 'GET',
  },
  {
    name: 'Monitoring Status',
    endpoint: '/monitoring/status',
    method: 'GET',
  },

  // Public endpoints
  {
    name: 'List Festivals',
    endpoint: '/api/festivals?status=PUBLISHED&limit=20',
    method: 'GET',
  },
  {
    name: 'Festival Details',
    endpoint: '/api/festivals/test-festival-id',
    method: 'GET',
  },

  // Analytics endpoints (heavy queries)
  {
    name: 'Dashboard KPIs',
    endpoint: '/api/analytics/dashboard?festivalId=test-festival-id',
    method: 'GET',
  },

  // Search endpoints
  {
    name: 'Search Vendors',
    endpoint: '/api/vendors?search=food&limit=20',
    method: 'GET',
  },

  // Ticket operations
  {
    name: 'List User Tickets',
    endpoint: '/api/tickets/me?limit=10',
    method: 'GET',
  },

  // Cashless operations
  {
    name: 'Cashless Balance',
    endpoint: '/api/cashless/balance',
    method: 'GET',
  },

  // Zone capacity (real-time critical)
  {
    name: 'Zone Capacity Status',
    endpoint: '/api/zones/festival/test-festival-id/capacity',
    method: 'GET',
  },
];

// Main execution
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('FESTIVAL API LOAD TESTING');
  console.log('='.repeat(60));

  const userConfig = parseArgs();
  const config: LoadTestConfig = { ...defaultConfig, ...userConfig };

  console.log(`\nConfiguration:`);
  console.log(`  Base URL: ${config.baseUrl}`);
  console.log(`  Duration per test: ${config.duration}s`);
  console.log(`  Concurrent connections: ${config.connections}`);
  console.log(`  Auth token: ${config.authToken ? 'Provided' : 'Not provided'}`);

  const tester = new LoadTester(config);

  // Run warm-up request
  console.log('\n[WARM-UP] Running warm-up request...');
  try {
    await tester.runTest('/api/health', 'GET');
  } catch (error) {
    console.error('Warm-up failed, continuing anyway...');
  }

  // Run all test scenarios
  console.log('\n[RUNNING TESTS]');

  for (const scenario of testScenarios) {
    try {
      await tester.runTest(scenario.endpoint, scenario.method, scenario.body, scenario.headers);
    } catch (error) {
      console.error(`Test failed for ${scenario.name}: ${(error as Error).message}`);
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Print summary
  tester.printSummary();

  // Export results
  const results = tester.getResults();
  const outputFile = `load-test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  console.log(`\nResults exported to: ${outputFile}`);
  require('fs').writeFileSync(outputFile, JSON.stringify(results, null, 2));
}

// Run the load test
main().catch((error) => {
  console.error('Load test failed:', error);
  process.exit(1);
});
