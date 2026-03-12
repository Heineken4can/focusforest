export type ApiSuccessResponse<T> = {
  status: 'success';
  message: string;
  data: T;
  meta: Record<string, never>;
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
