export type ApiSuccessResponse<T> = {
  status: 'success';
  message: string;
  data: T;
  meta: Record<string, unknown>;
};

export const createSuccessResponse = <T>(
  message: string,
  data: T,
): ApiSuccessResponse<T> => ({
  status: 'success',
  message,
  data,
  meta: {},
});
