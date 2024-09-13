import config from '../../../config'

export function createHeaders (responseType?: string, apiKey = config.llms.apiKey): Record<string, string | any> {
  const headers: Record<string, string | any> = {}
  if (responseType) {
    headers.responseType = responseType
  }
  headers.headers = { Authorization: `Bearer ${apiKey}` }
  return headers
}

export const headers = createHeaders()
export const headersStream = createHeaders('stream')
