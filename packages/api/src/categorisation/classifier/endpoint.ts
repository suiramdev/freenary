export const CLASSIFIER_REQUEST_TIMEOUT_MS = 10_000;

export const endpointHeaders = (apiKey: string | undefined): Headers => {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (apiKey !== undefined && apiKey.length > 0) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  return headers;
};
