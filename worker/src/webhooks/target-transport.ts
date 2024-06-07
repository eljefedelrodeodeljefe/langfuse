


// import * as dns from 'dns';
// import { Pool, Agent, setGlobalDispatcher } from 'undici'
// import { Writable } from 'stream'

// const agent = new Agent({
//   connect: {
//     lookup: dns.lookup,
//   },
// });

// setGlobalDispatcher(agent)


// const client = !hasBridgeTarget ? undefined : new Pool(process.env.LANGFUSE_WEBHOOKS_BRIDGE_TARGET_BASE_URL as string, {
//   maxRedirections: 1,
// })

// interface RequestOptions {
//   body: string
// }

// class SimpleRequest {
//   private readonly dst: Writable
//   private statusCode?: number

//   reject: (err: Error) => void

//   constructor(resolve: (value: unknown) => void, reject: (err: Error) => void) {
//     this.dst = new Writable({
//       write(chunk, encoding, callback) {
//         callback()
//       }
//     }).on('finish', resolve)

//     this.reject = (err: Error) => {
//       reject(err)
//     }
//   }

//   onConnect(_: any) { }

//   onHeaders(statusCode: number, headers: Buffer[], resume: () => void, statusText: string) {
//     this.statusCode = statusCode
//     this.dst.on('drain', resume)
//     return true
//   }

//   onData(chunk: string | Buffer) {
//     return this.dst.write(chunk)
//   }

//   onComplete() {
//     this.dst.end()
//   }

//   onError(err: Error) {
//     this.reject(err)
//   }
// }


// return new Promise((resolve, reject) => {
//   client.dispatch({
//     path: '/',
//     method: 'POST',
//     headers: {
//       'content-type': 'application/json'
//     },
//     body: options.body
//   }, new SimpleRequest(resolve, reject))
// })


export interface TargetTransportRequestOptions {
  url: string
  body?: Record<string, any>
  headers?: TargetTransportRequestAuthBearerHeaders | TargetTransportRequestAuthSigntatureHeaders | Record<string, any>
}

export async function makeEventTargetRequest(options: TargetTransportRequestOptions) {
  await fetchWithOptions(options)
}

/**
 * @deprecated not implemented
 */
export interface TargetTransportRequestAuthSigntatureHeaders {
  'X-Langfuse-Event-ID': string
  'X-Langfuse-Event-Timestamp': string
  'X-Langfuse-Event-Signature': string
}

export interface TargetTransportRequestAuthBearerHeaders {
  'X-Langfuse-Event-Auth-Bearer': string
}

interface TargetTransportRequestFetchOptions extends TargetTransportRequestOptions {
  timeout?: number
}


async function fetchWithOptions(options: TargetTransportRequestFetchOptions): Promise<Response> {
  const {
    timeout = 1500,
    url,
    headers = {}
  } = options;


  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);

  const requestOptions: RequestInit = {
    signal: controller.signal,
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "Accept": "application/json",
    }
  }

  if (options.body) {
    requestOptions.body = JSON.stringify(options.body)
  }

  // TODO: throw non fetch errors here as they will be aborted
  const response = await fetch(url, requestOptions);

  if (![200, 201, 202].includes(response.status)) {
    throw new Error("Invalid response status");
  }

  clearTimeout(timeoutHandle);

  return response;
};
