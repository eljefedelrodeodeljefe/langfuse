import { v4 } from "uuid";
import type { LangfusePrompt } from "../entities/prompt";
import type { VersionedSerializable, VersionedSerializableToStructFnReturnType } from "../entities";

export const eventCatalog = {
  prompt: {
    created: 'prompt.created',
    updated: 'prompt.updated',
    deleted: 'prompt.deleted',
  }
} as const

type EventCatalog = typeof eventCatalog;
type Values<T> = T[keyof T];
type Flatten<T> = T extends object ? Values<{ [K in keyof T]: Flatten<T[K]> }> : T;

export type EventBrokerEventTopics = Flatten<EventCatalog>;

export type EventBrokerEventVersionLevel = '*' | 'v1' | 'v2'

export interface IEventBrokerEventAttributes<T> {
  timestamp?: Date;
  /**
   * The transitive "id" that denotes the idempotency of the event itself, not the idempotency
   * of e.g. a webhook request
   */
  id?: string;
  /**
   * Entity-derived topic
   */
  topic: EventBrokerEventTopics;
  /**
   * The maximum version of the event that the consumer can handle. This property is being used
   * to translate the latest shape of an object to an older one, give then, the transported payload
   * supports such operations.
   */
  max_version?: EventBrokerEventVersionLevel;
  /**
   * The project id that is being used as the main routing mecahnism e.g. for webhooks
   */
  projectId: string;
  /**
   * The payload of the event, which includes at the very least the object, that that this event
   * carries or was handled, but allows for additional properties to be added, such as embeds, older
   * versions of the object, etc.
   */
  payload: {
    object: T
    // we will reserve the right to add new properties here, such as the old version of an
    // object, or other objects, but are permissive here for the caller now
    [key: string]: any
  }
}

export interface ISerializableEventBrokerEventEntity<T extends VersionedSerializable> extends Omit<IEventBrokerEventAttributes<T>, 'timestamp' | 'id' | 'payload'> {
  timestamp: string
  id: string,
  payload: {
    object: VersionedSerializableToStructFnReturnType
    [key: string]: any
  }
}

export abstract class EventBrokerEventEntity<T extends VersionedSerializable> {
  abstract topic: EventBrokerEventTopics;

  attributes: IEventBrokerEventAttributes<T>

  constructor(opts: IEventBrokerEventAttributes<T>) {
    // super();

    const {
      topic,
      payload,
      timestamp = new Date(),
      id = v4(),
      max_version = '*',
      projectId
    } = opts;

    this.attributes = {
      topic: topic,
      timestamp: timestamp,
      id: id,
      payload: payload,
      max_version: max_version,
      projectId,
    }
  }

  public toObject(): ISerializableEventBrokerEventEntity<T> {
    let payload: ISerializableEventBrokerEventEntity<T>['payload'] = {
      object: this.attributes.payload.object.to.latest.struct()
    }

    // TODO: handle version here

    return {
      topic: this.topic,
      timestamp: this.attributes.timestamp!.toISOString(),
      id: this.attributes.id!,
      payload: payload,
      max_version: this.attributes.max_version,
      projectId: this.attributes.projectId,
    }
  }
}

export class BrokerEventPromptCreated extends EventBrokerEventEntity<LangfusePrompt> {
  topic: EventBrokerEventTopics = eventCatalog.prompt.created;

  constructor(opts: Pick<IEventBrokerEventAttributes<LangfusePrompt>, 'payload' | 'projectId'>) {

    super({
      ...opts,
      topic: BrokerEventPromptCreated.prototype.topic,
    });
  }

  static create(opts: Pick<IEventBrokerEventAttributes<LangfusePrompt>, 'payload'> & { projectId?: string }) {
    let projectId = opts.projectId ?? opts?.payload?.object?.attributes?.projectId

    if (!projectId) {
      throw new Error('projectId is required')
    }

    return new BrokerEventPromptCreated({ ...opts, projectId })
  }
}
