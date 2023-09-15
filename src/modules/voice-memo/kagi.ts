import axios from 'axios'

interface SummarizationResponse {
  meta: {
    id: string
    node: string
    ms: string
  }
  data: {
    output: string
  }
  tokens: number
  error?: Array<{ code: number, msg: string }>
}

export class Kagi {
  private readonly apiKey: string
  private readonly pricePerHour = 0.5 // roughly estimate

  constructor (apiKey: string) {
    this.apiKey = apiKey
  }

  public async getSummarization (audioUrl: string): Promise<string> {
    const url = `https://kagi.com/api/v0/summarize?url=${audioUrl}`
    console.log('Kagi request url:', url)
    const { data } = await axios.get<SummarizationResponse>(url, { headers: { Authorization: `Bot ${this.apiKey}` } })
    return data.data.output || ''
  }

  public estimatePrice (duration: number): number {
    return this.pricePerHour * duration / 60 / 60
  }
}
