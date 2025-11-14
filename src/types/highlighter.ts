export type HighlightRequest = {
  id: number
  code: string
  lang: string
  dark: boolean
  preClass?: string
}

export type HighlightSuccessResponse = {
  id: number
  html: string
  error?: never
}

export type HighlightErrorResponse = {
  id: number
  html?: never
  error: string
}

export type HighlightResponse =
  | HighlightSuccessResponse
  | HighlightErrorResponse

// Type guard for error responses
export function isErrorResponse(
  response: HighlightResponse,
): response is HighlightErrorResponse {
  return 'error' in response && response.error !== undefined
}
