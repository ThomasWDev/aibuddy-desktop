/**
 * KAN-272 FIX: Safe API response parser
 *
 * Root cause: The Desktop app checked the Content-Type header BEFORE trying to
 * parse the response body as JSON. When the ALB/proxy returned a valid JSON
 * body with a missing or unexpected Content-Type header (e.g. text/html, null),
 * the client treated it as an error — even though the body was perfectly valid
 * JSON with HTTP 200. This showed users "Unexpected Response (200)".
 *
 * Fix: Try JSON.parse on the body text first. Only treat it as a non-JSON
 * error if parsing actually fails. Content-Type is used as a hint for logging,
 * not as a gate.
 */

export interface ParsedApiResponse {
  ok: true
  data: Record<string, unknown>
}

export interface ParsedApiError {
  ok: false
  status: number
  contentType: string | null
  bodyPreview: string
  parseError?: string
}

export type ApiResponseResult = ParsedApiResponse | ParsedApiError

/**
 * Safely parse an HTTP Response into JSON, tolerating missing/wrong Content-Type.
 *
 * @param response - The fetch Response object
 * @param timeoutMs - Max time allowed for body parsing (default 60 000 ms)
 * @returns ParsedApiResponse on success, ParsedApiError on failure
 */
export async function safeParseResponse(
  response: Response,
  timeoutMs = 60_000
): Promise<ApiResponseResult> {
  const contentType = response.headers.get('content-type')
  let bodyText: string

  try {
    bodyText = await Promise.race([
      response.text(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error(`Body read timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
  } catch (err) {
    return {
      ok: false,
      status: response.status,
      contentType,
      bodyPreview: '',
      parseError: (err as Error).message,
    }
  }

  try {
    const data = JSON.parse(bodyText)
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      return { ok: true, data }
    }
    return {
      ok: false,
      status: response.status,
      contentType,
      bodyPreview: bodyText.substring(0, 200),
      parseError: 'Response parsed as JSON but is not an object',
    }
  } catch {
    return {
      ok: false,
      status: response.status,
      contentType,
      bodyPreview: bodyText.substring(0, 200),
      parseError: contentType?.includes('application/json')
        ? 'Content-Type says JSON but body is not valid JSON'
        : `Non-JSON response (Content-Type: ${contentType ?? 'none'})`,
    }
  }
}

/**
 * Synchronous version for pre-fetched body text (used by callAI helper).
 */
export function safeParseBody(
  bodyText: string,
  status: number,
  contentType: string | null
): ApiResponseResult {
  try {
    const data = JSON.parse(bodyText)
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      return { ok: true, data }
    }
    return {
      ok: false,
      status,
      contentType,
      bodyPreview: bodyText.substring(0, 200),
      parseError: 'Response parsed as JSON but is not an object',
    }
  } catch {
    return {
      ok: false,
      status,
      contentType,
      bodyPreview: bodyText.substring(0, 200),
      parseError: `Failed to parse response body as JSON`,
    }
  }
}
