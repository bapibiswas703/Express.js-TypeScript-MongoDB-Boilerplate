export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface SortQuery {
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface CursorPaginationQuery {
  cursor?: string;
  limit: number;
}

export interface CursorPaginationMeta {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface IdParam {
  id: string;
}
