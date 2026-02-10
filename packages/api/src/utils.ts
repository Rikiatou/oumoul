export function buildQuery(params: Record<string, unknown> | object | undefined | null) {
  if (!params) return '';
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          search.append(key, String(item));
        }
      });
    } else {
      search.append(key, String(value));
    }
  }

  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
}
