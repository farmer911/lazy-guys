export interface ApiSuccessResponse<T> {
  readonly data: T;
}

export interface ApiListResponse<T> {
  readonly data: readonly T[];
}

export interface CursorPageResponse<T> {
  readonly data: readonly T[];
  readonly pagination: {
    readonly nextCursor: string | null;
    readonly hasMore: boolean;
  };
}

export interface ApiErrorResponse {
  readonly error: string;
}
