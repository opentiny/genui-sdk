import { ServiceParameters, type RequestOptions } from '@a2a-js/sdk/client';

export function buildSdkRequestOptions(
  headers: Record<string, string>,
  abortSignal?: AbortSignal,
): RequestOptions {
  const serviceParameters =
    Object.keys(headers).length > 0
      ? ServiceParameters.createFrom(undefined, (params) => ({ ...params, ...headers }))
      : undefined;

  return {
    signal: abortSignal,
    serviceParameters,
  };
}
