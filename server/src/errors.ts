export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}
export type SearchFailureReason =
  | 'SEARCH_PROVIDER_UNAVAILABLE'
  | 'NETWORK_FAILURE'
  | 'ANTI_BOT_CHALLENGE'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'RESULT_PARSING_FAILURE'

/** Falha operacional do provedor, distinta de uma busca válida sem evidências. */
export class SearchUnavailableError extends Error {
  constructor(message: string, public readonly reason: SearchFailureReason = 'SEARCH_PROVIDER_UNAVAILABLE') {
    super(message)
  }
}
export class AiUnavailableError extends Error {}
export class AiInvalidResponseError extends Error {}
