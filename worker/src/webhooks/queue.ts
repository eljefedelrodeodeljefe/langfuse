import pRetry from "p-retry";
import { setTimeout } from "timers/promises";
import PQueue from "p-queue";

// using mjs here to be able to import esm only modules

/**
 *
 * @typedef {Object} QueueItem
 */

export class Queue {
  intervalMs = 3000;
  backoffIntervalBaseMs = 100;
  concurrency = 20;
  maxRetries = 5;
  /** @type {PQueue|null} */
  queue: PQueue | null = null;

  constructor() { }

  _shouldStop = false;

  /**
   * @param {} fn function to execute with our retry logic
   */
  async processFn(fn: () => Promise<void>) {
    if (!this.queue) {
      throw new Error("Queue not started");
    }

    await this.queue.add(async () => {
      const run = async () => {
        try {
          await fn();
        } catch (error) {
          // TODO: move error generation to transport, as we need to produce and un-abortable error
          throw new Error("fetch-error");
        }
      };

      await pRetry(run, {
        onFailedAttempt: (error) => this._onFailedAttempt(error),
        retries: this.maxRetries,
      });
    });
  }
  /**
   *
   * @param {Error} _error
   */
  async onFailedAttempt(_error: Error) {
    // can be overridden, but by default we do nothing
  }

  async _onFailedAttempt(error: Error & { attemptNumber: number }) {
    const timeout = this.calculateIntervalIntervalWithBackoff(
      error.attemptNumber,
    );

    await setTimeout(timeout);
  }

  calculateIntervalIntervalWithBackoff(attemptNumber: number) {
    return Math.pow(2, attemptNumber) * this.backoffIntervalBaseMs;
  }

  start() {
    this.queue = new PQueue({
      concurrency: this.concurrency,
    });
  }

  stop() {
    this._shouldStop = true;
  }
}
