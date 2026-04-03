export function buildAuthHeaders(
  accessToken: string,
  headers: HeadersInit = {},
): HeadersInit {
  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`,
  };
}
