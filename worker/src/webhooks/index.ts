
import { setTimeout } from 'timers/promises';
import pForever from 'p-forever';
import { prisma, type ProjectWebhookEndpoint } from "@langfuse/shared/src/db";
import logger from "../logger";
import {
  makeEventTargetRequest, type TargetTransportRequestAuthSigntatureHeaders,
  type TargetTransportRequestAuthBearerHeaders, type TargetTransportRequestOptions
} from './target-transport'
import { Queue } from './queue';

class WebhooksQueue extends Queue { }

let endpoints: Partial<ProjectWebhookEndpoint>[] = []


const entityQuery = {
  where: { enabled: true },
  select: { url: true, projectId: true, apiVersion: true, auth: true }
}

/**
 * The routable object. The full shape is being generated the producer (currently the web app)
 */
export interface WebhooEventkBodyStruct {
  projectId: string
  topic: string
  [key: string]: any
}

export interface WebhooEventkAuthStructBearer {
  data: {
    token: string
  }
  kind: 'Bearer'
}

export type WebhooEventkAuthConfig = WebhooEventkAuthStructBearer | Record<string, any> | undefined | null

export class WebhooksQueueManager {
  static _instance: WebhooksQueueManager;

  static isWebhooksEnabled: boolean = true
  private shouldStop = false

  private readonly queue: WebhooksQueue;
  constructor() {
    this.queue = new WebhooksQueue()

  }

  public static get instance(): WebhooksQueueManager {
    if (!WebhooksQueueManager._instance) {
      WebhooksQueueManager._instance = new WebhooksQueueManager();
    }

    return WebhooksQueueManager._instance;
  }

  static findEndpoinForEvent(event: WebhooEventkBodyStruct) {
    return endpoints.filter(endpoint => {
      if (!event.projectId || !event.topic || !endpoint.url) return false

      return endpoint.projectId === event.projectId && endpoint.eventTypes?.includes(event.topic)
    })
  }

  static makeAuthHeader(auth: ProjectWebhookEndpoint['auth']): TargetTransportRequestAuthSigntatureHeaders | TargetTransportRequestAuthBearerHeaders | Record<string, any> {
    let _auth = auth as WebhooEventkAuthConfig

    if (_auth?.kind === 'Bearer' && _auth.data.token) {
      return {
        'X-Langfuse-Event-Auth-Bearer': `Bearer ${_auth.data.token}`
      } as TargetTransportRequestAuthBearerHeaders
    }

    return {}
  }

  addEvent<T>(body: WebhooEventkBodyStruct) {
    if (!WebhooksQueueManager.isWebhooksEnabled) return

    const eligigbleEndpoints = WebhooksQueueManager.findEndpoinForEvent(body)

    for (const endpoint of eligigbleEndpoints) {
      let headers: Record<string, any> | undefined = {}

      if (endpoint.auth) {
        headers = WebhooksQueueManager.makeAuthHeader(endpoint.auth)
      }

      const requestConfig = {
        url: endpoint.url!,
        body,
        headers
      }

      this.queue.processFn(async () => {
        await makeEventTargetRequest(requestConfig)
      }).then(() => {
        this.onTaskComplete(requestConfig)
      }).catch((err) => {
        this.onFinalTaskError(err, requestConfig)
      })
    }
  }

  start(): WebhooksQueueManager {
    if (!WebhooksQueueManager.isWebhooksEnabled) return this

    this.queue.start();

    // @ts-expect-error type mismatch in lib
    this.queue.queue!.on('error', (err) => {
      logger.error(err, 'webhooks queue error')
    })

    pForever(async () => {
      if (this.shouldStop) return pForever.end;

      logger.info('fetching webhooks endpoints')

      endpoints = (await prisma.projectWebhookEndpoint.findMany())
      await setTimeout(60000)
    });

    return this;
  }

  stop(): WebhooksQueueManager {
    this.shouldStop = true
    if (!WebhooksQueueManager.isWebhooksEnabled) return this

    this.queue.stop();

    return this;
  }


  onTaskComplete(config: TargetTransportRequestOptions) {
    logger.debug(config, 'webhook task complete')
  }

  onFinalTaskError(err: Error, config: TargetTransportRequestOptions) {
    logger.error(err, 'webhook task final error')
  }
}

export default WebhooksQueueManager.instance.start()

process.on('exit', () => [
  WebhooksQueueManager.instance.stop()
])


