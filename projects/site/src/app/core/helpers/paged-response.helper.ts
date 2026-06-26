/** Normalize Week 1+ paged API bodies and legacy raw arrays. */
export function extractPagedResults<T>(body: unknown): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const list = record['results'] ?? record['Results'] ?? record['data'] ?? record['items'];
    return Array.isArray(list) ? (list as T[]) : [];
  }
  return [];
}

export function extractPagedTotal(body: unknown, fallbackLength = 0): number {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    const total = record['totalNumberOfRecords'] ?? record['TotalNumberOfRecords'] ?? record['total'];
    const n = Number(total);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  return fallbackLength;
}
