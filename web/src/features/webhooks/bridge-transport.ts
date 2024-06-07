import { env } from "@/src/env.mjs";

export interface EventBridgeRequestOptions {
  body?: Record<string, any>
}

export async function makeEventBridgeRequest(options: EventBridgeRequestOptions) {
  const bridgeApi = `${env.LANGFUSE_WORKER_HOST}/api/event_bridge/events`

  await fetchWithOptions(bridgeApi, options)
}

interface EventBridgeRequestFetchOptions extends EventBridgeRequestOptions {
  timeout?: number
}


async function fetchWithOptions(url: string, options: EventBridgeRequestFetchOptions = {}): Promise<Response> {
  const {
    timeout = 3000
  } = options;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);

  const requestOptions: RequestInit = {
    signal: controller.signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        Buffer.from(
          "admin" + ":" + env.LANGFUSE_WORKER_PASSWORD,
        ).toString("base64"),
    }
  }

  if (options.body) {
    requestOptions.body = JSON.stringify(options.body)
  }

  // TODO: throw non fetch errors here as they will be aborted
  const response = await fetch(url, requestOptions);

  clearTimeout(timeoutHandle);

  return response;
};
