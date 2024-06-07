import { type EventBrokerEventEntity, type ISerializableEventBrokerEventEntity } from './events';
import { type VersionedSerializable } from '../entities';
import { EventEmitter, } from 'events';

export interface EventsBroker {
  on(event: 'event-dispatch', listener: <T extends VersionedSerializable>(body: ISerializableEventBrokerEventEntity<T>) => void): this;
  on(event: string, listener: Function): this;
}


export class EventsBroker extends EventEmitter {
  static #instance: EventsBroker;

  private constructor() {
    super()
  }

  public static get instance(): EventsBroker {
    if (!EventsBroker.#instance) {
      EventsBroker.#instance = new EventsBroker();
    }

    return EventsBroker.#instance;
  }

  /**
   * By dispatching an event, consumers in our application can decide whether they want to process
   * this payload.
   *
   * By default 
   * @param event
   */
  static dispatch<T extends VersionedSerializable>(event: EventBrokerEventEntity<T>) {
    console.log('dispatching event', event.toObject(), EventsBroker.instance.listenerCount('event-dispatch'));

    EventsBroker.instance.emit('event-dispatch', event.toObject())
  }
}

// export async function useDispatch<T>(promise: Promise<T>, ctr: new (...args: ConstructorParameters<typeof EventBrokerEventEntity<T>>) => EventBrokerEventEntity<T>): Promise<T> {
//   const data = await promise

//   // EventsBroker.instance.dispatch(new ctr({
//   //   topic: ctr.prototype.topic,
//   //   payload: {
//   //     object: data as T
//   //   }
//   // }))

//   return data
// }

export default EventsBroker.instance