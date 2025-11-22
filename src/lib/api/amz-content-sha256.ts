const EMPTY_PAYLOAD_HASH =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const METHODS_REQUIRING_HASH = new Set(["POST", "PUT"]);

async function hashToHex(data: Uint8Array): Promise<string> {
  if (data.byteLength === 0) {
    return EMPTY_PAYLOAD_HASH;
  }

  const sourceBuffer =
    data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
      ? data.buffer
      : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const digestSource =
    sourceBuffer instanceof ArrayBuffer ? sourceBuffer : data.slice().buffer;
  const digest = await crypto.subtle.digest("SHA-256", digestSource);
  const bytes = new Uint8Array(digest);

  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex;
}

function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return ArrayBuffer.isView(value);
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isUrlSearchParams(value: unknown): value is URLSearchParams {
  return (
    typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams
  );
}

async function resolveBodyBytes(
  body: RequestInit["body"],
): Promise<{ bytes: Uint8Array; body: RequestInit["body"] }> {
  if (body === null || body === undefined) {
    return { bytes: new Uint8Array(), body: null };
  }

  if (typeof body === "string") {
    return { bytes: new TextEncoder().encode(body), body };
  }

  if (isUrlSearchParams(body)) {
    return { bytes: new TextEncoder().encode(body.toString()), body };
  }

  if (body instanceof ArrayBuffer) {
    return { bytes: new Uint8Array(body), body };
  }

  if (isArrayBufferView(body)) {
    return {
      bytes: new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
      body,
    };
  }

  if (isBlob(body)) {
    const buffer = await body.arrayBuffer();
    return { bytes: new Uint8Array(buffer), body };
  }

  throw new Error(
    "Unsupported request body type for x-amz-content-sha256 header.",
  );
}

export async function withAmzContentSha256Header(
  init: RequestInit,
): Promise<RequestInit> {
  const method = init.method?.toUpperCase();
  if (!method || !METHODS_REQUIRING_HASH.has(method)) {
    return init;
  }

  const headers = new Headers(init.headers ?? undefined);
  const { bytes, body } = await resolveBodyBytes(init.body);
  const hash = await hashToHex(bytes);

  headers.set("x-amz-content-sha256", hash);

  return {
    ...init,
    headers,
    body,
  };
}

export async function withAmzContentSha256Request(
  request: Request,
): Promise<Request> {
  const method = request.method.toUpperCase();
  if (!METHODS_REQUIRING_HASH.has(method)) {
    return request;
  }

  const clone = request.clone();
  const buffer = await clone.arrayBuffer();
  const baseBody: RequestInit["body"] = buffer.byteLength > 0 ? buffer : null;

  const hashedInit = await withAmzContentSha256Header({
    cache: "no-store",
    method,
    headers: request.headers,
    body: baseBody,
  });

  const requestInit: RequestInit = {
    ...hashedInit,
    headers: new Headers(hashedInit.headers ?? undefined),
  };

  const resolvedBody = hashedInit.body ?? baseBody;
  if (typeof resolvedBody !== "undefined") {
    requestInit.body = resolvedBody;
  }

  return new Request(request, requestInit);
}
