import { PaginationParams, PaginatedResult } from '@medconnect/types';

export function getPaginationParams(query: Record<string, unknown>): {
  limit: number;
  cursor?: string;
} {
  const limit = Math.min(Number(query.limit) || 20, 100);
  const cursor = query.cursor as string | undefined;
  return { limit, cursor };
}

export function buildCursorPaginatedResult<T extends { id: string }>(
  rows: T[],
  limit: number,
): PaginatedResult<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

  return {
    data,
    nextCursor,
    hasMore,
    total: data.length,
  };
}
