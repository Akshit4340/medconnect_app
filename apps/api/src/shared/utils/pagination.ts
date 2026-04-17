import { PaginationParams, PaginatedResult } from '@medconnect/types';

export function getPaginationParams(query: Record<string, unknown>): {
  limit: number;
  cursor?: string;
} {
  const limit = Math.min(Number(query.limit) || 20, 100);
  const cursor = query.cursor as string | undefined;
  return { limit, cursor };
}

export function buildCursorPaginatedResult<
  T extends { id: string; createdAt: Date },
>(rows: T[], limit: number): PaginatedResult<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | undefined = undefined;
  if (hasMore && data.length > 0) {
    const lastItem = data[data.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({
        id: lastItem.id,
        createdAt: lastItem.createdAt.toISOString(),
      }),
    ).toString('base64');
  }

  return {
    data,
    nextCursor,
    hasMore,
    total: data.length,
  };
}
