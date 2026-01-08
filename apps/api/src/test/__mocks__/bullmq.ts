/**
 * Mock implementation of the bullmq module for testing
 *
 * This mock provides stub implementations of BullMQ classes
 * that can be used in unit tests without requiring Redis.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

// Mock Queue class using ES6 class syntax
export class Queue {
  name: string;
  add = jest.fn().mockResolvedValue({ id: 'mock-job-id', data: {} });
  getJob = jest.fn().mockResolvedValue(null);
  getWaitingCount = jest.fn().mockResolvedValue(0);
  getActiveCount = jest.fn().mockResolvedValue(0);
  getCompletedCount = jest.fn().mockResolvedValue(0);
  getFailedCount = jest.fn().mockResolvedValue(0);
  getDelayedCount = jest.fn().mockResolvedValue(0);
  isPaused = jest.fn().mockResolvedValue(false);
  pause = jest.fn().mockResolvedValue(undefined);
  resume = jest.fn().mockResolvedValue(undefined);
  obliterate = jest.fn().mockResolvedValue(undefined);
  getFailed = jest.fn().mockResolvedValue([]);
  close = jest.fn().mockResolvedValue(undefined);
  getJobs = jest.fn().mockResolvedValue([]);
  drain = jest.fn().mockResolvedValue(undefined);
  clean = jest.fn().mockResolvedValue([]);

  constructor(name: string, options?: unknown) {
    this.name = name;
  }
}

// Mock Worker class using ES6 class syntax
export class Worker {
  name: string;
  on = jest.fn().mockReturnThis();
  close = jest.fn().mockResolvedValue(undefined);
  run = jest.fn().mockResolvedValue(undefined);
  pause = jest.fn().mockResolvedValue(undefined);
  resume = jest.fn().mockResolvedValue(undefined);
  isRunning = jest.fn().mockReturnValue(true);
  isPaused = jest.fn().mockReturnValue(false);

  constructor(name: string, processor: unknown, options?: unknown) {
    this.name = name;
  }
}

// Mock QueueEvents class using ES6 class syntax
export class QueueEvents {
  name: string;
  on = jest.fn().mockReturnThis();
  close = jest.fn().mockResolvedValue(undefined);
  removeAllListeners = jest.fn().mockReturnThis();

  constructor(name: string, options?: unknown) {
    this.name = name;
  }
}

// Mock Job class using ES6 class syntax
export class Job {
  id = 'mock-job-id';
  name: string;
  data: unknown;
  updateProgress = jest.fn().mockResolvedValue(undefined);
  log = jest.fn().mockResolvedValue(undefined);
  remove = jest.fn().mockResolvedValue(undefined);
  retry = jest.fn().mockResolvedValue(undefined);
  moveToFailed = jest.fn().mockResolvedValue(undefined);
  moveToCompleted = jest.fn().mockResolvedValue(undefined);
  getState = jest.fn().mockResolvedValue('waiting');
  progress = 0;
  attemptsMade = 0;
  failedReason: string | undefined = undefined;
  finishedOn: number | undefined = undefined;
  processedOn: number | undefined = undefined;
  timestamp = Date.now();

  constructor(queue: unknown, name: string, data: unknown) {
    this.name = name;
    this.data = data;
  }
}

// Mock FlowProducer class using ES6 class syntax
export class FlowProducer {
  add = jest.fn().mockResolvedValue({ job: { id: 'mock-flow-job-id' }, children: [] });
  addBulk = jest.fn().mockResolvedValue([]);
  close = jest.fn().mockResolvedValue(undefined);

  constructor(options?: unknown) {}
}

// Mock QueueScheduler class (deprecated in BullMQ v5+, but still used in some versions)
export class QueueScheduler {
  name: string;
  close = jest.fn().mockResolvedValue(undefined);
  run = jest.fn().mockResolvedValue(undefined);

  constructor(name: string, options?: unknown) {
    this.name = name;
  }
}

// Export types (empty interfaces for compatibility)
export interface JobsOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: { type: string; delay: number };
  repeat?: { pattern?: string; every?: number };
  jobId?: string;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface WorkerOptions {
  concurrency?: number;
  limiter?: { max: number; duration: number };
  connection?: unknown;
}

export interface QueueOptions {
  connection?: unknown;
  defaultJobOptions?: JobsOptions;
}

export default {
  Queue,
  Worker,
  QueueEvents,
  Job,
  FlowProducer,
  QueueScheduler,
};
