const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

interface ErrorResponseBody {
  detail?: string;
}

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as ErrorResponseBody | null;
    return payload?.detail ?? fallback;
  }

  return (await response.text().catch(() => fallback)) || fallback;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(buildUrl(path), init);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Request failed."));
  }

  return response;
}

export async function requestJson<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await request(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  return (await response.json()) as TResponse;
}

export async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const response = await request(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  return response.blob();
}
