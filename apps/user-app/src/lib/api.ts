// Standardized API client for consistent fetch patterns

import type { ApiResponse } from "~/types";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/**
 * Make an API request with standardized error handling and JSON parsing.
 * Returns the full API response including success/error status.
 */
export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { body, headers, ...rest } = options;

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json() as Promise<ApiResponse<T>>;
}

/**
 * Make an API mutation (POST, PATCH, DELETE) with error handling.
 * Throws an error if the response is not successful.
 */
export async function apiMutate<T, P = unknown>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: P
): Promise<T> {
  const response = await apiRequest<T>(url, {
    method,
    body: payload,
  });

  if (!response.success) {
    throw new Error(response.error || "Request failed");
  }

  return response.data as T;
}

/**
 * Make an API GET request and extract the data.
 * Throws an error if the response is not successful.
 */
export async function apiFetch<T>(url: string): Promise<T> {
  const response = await apiRequest<T>(url);

  if (!response.success) {
    throw new Error(response.error || "Request failed");
  }

  return response.data as T;
}

/**
 * Build URL with query parameters.
 */
export function buildUrl(
  base: string,
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
}
