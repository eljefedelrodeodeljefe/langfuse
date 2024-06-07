import { env } from "@/src/env.mjs";
import { makeEventBridgeRequest } from './bridge-transport'
import { Queue } from './queue.mjs';
import type { EventBrokerEventEntity } from '../../events-broker/events';
import { EventsBroker } from '../../events-broker';
import type { VersionedSerializable } from "../../entities";

export class WebhooksQueue extends Queue { }

const webhooksEnabled = env.LANGFUSE_WEBHOOKS_ENABLED

export class WebhooksQueueManager {
  static #instance: WebhooksQueueManager;

  static isWebhooksEnabled: boolean = webhooksEnabled

  private readonly queue: WebhooksQueue;
  constructor() {
    this.queue = new WebhooksQueue();
  }

  public static get instance(): WebhooksQueueManager {
    if (!WebhooksQueueManager.#instance) {
      WebhooksQueueManager.#instance = new WebhooksQueueManager();
    }

    return WebhooksQueueManager.#instance;
  }

  addEvent<T extends VersionedSerializable>(body: ReturnType<EventBrokerEventEntity<T>['toObject']>) {
    if (!WebhooksQueueManager.isWebhooksEnabled) return

    if (!env.LANGFUSE_WORKER_HOST) {
      console.warn('LANGFUSE_WORKER_HOST is not set, skipping event dispatch')
      return
    }

    this.queue.processFn(async () => {
      await makeEventBridgeRequest({
        body
      })
    }).then(() => {
      this.onTaskComplete({ body })
    }).catch((err) => {
      this.onFinalTaskError(err)
    })
  }

  start(): WebhooksQueueManager {
    if (!WebhooksQueueManager.isWebhooksEnabled) return this

    this.queue.start();

    this.queue.queue!.on('error', (err) => {
      this.onTaskError(err)
    })

    EventsBroker.instance.on('event-dispatch', this.onEventDispatch)
    return this;
  }

  stop(): WebhooksQueueManager {
    if (!WebhooksQueueManager.isWebhooksEnabled) return this

    this.queue.stop();
    EventsBroker.instance.removeListener('event-dispatch', this.onEventDispatch)
    return this;
  }

  onEventDispatch<T extends VersionedSerializable>(body: ReturnType<EventBrokerEventEntity<T>['toObject']>) {
    WebhooksQueueManager.instance.addEvent(body)
  }

  onTaskComplete<T extends VersionedSerializable>({ body }: { body: ReturnType<EventBrokerEventEntity<T>['toObject']> }) {
    // TODOL start emitting or logging
  }

  onFinalTaskError(_: Error) {
    // TODO: start emitting or logging
  }

  onTaskError(_: Error) {
    // TODO: start emitting or logging
  }
}

export default WebhooksQueueManager.instance.start()

process.on('exit', () => [
  WebhooksQueueManager.instance.stop()
])


