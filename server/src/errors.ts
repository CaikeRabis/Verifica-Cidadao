export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}
export class SearchUnavailableError extends Error {}
export class AiUnavailableError extends Error {}
export class AiInvalidResponseError extends Error {}
