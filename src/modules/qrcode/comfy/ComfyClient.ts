import axios, { type AxiosInstance } from 'axios'
import FormData from 'form-data'
import { v4 as uuidv4 } from 'uuid'
import Websocket from 'websocket'

interface HistoryResponseItem {
  prompt: any
  outputs: Record<string, {
    images: Array<{
      'filename': string
      'subfolder': string
      'type': 'output'
    }>
  }>
}

type HistoryResponse = Record<string, HistoryResponseItem>

interface QueuePromptResponse {
  prompt_id: string
  number: number
}

interface UploadImageResponse {
  name: string
  subfolder: string
  type: 'input'
}

interface PromptResult {
  'type': 'executed'
  'data': {
    'prompt_id': string
    'node': string
    'output': {
      'images': [
        {
          'filename': string
          'subfolder': string
          'type': string
        }
      ]
    }
  }
}

export class ComfyClient {
  private readonly host: string
  private readonly wsHost: string
  private readonly httpClient: AxiosInstance
  private readonly wsClient: Websocket.client
  public clientId: string
  public wsConnection: Websocket.connection | null

  constructor ({ host, wsHost }: { host: string, wsHost: string }) {
    this.clientId = uuidv4()
    this.host = host
    this.wsHost = wsHost
    this.httpClient = axios.create({ baseURL: host })
    this.wsClient = new Websocket.client()
    this.wsConnection = null
    this.initWebsocket()
  }

  initWebsocket (): void {
    this.wsClient.on('connectFailed', function (error) {
      console.log('Connect Error: ' + error.toString())
    })

    this.wsClient.on('connect', (connection) => {
      this.wsConnection = connection

      // console.log('WebSocket Client Connected');
      connection.on('error', (error) => {
        console.log('Connection Error: ' + error.toString())
      })
      connection.on('close', () => {
        // console.log('Connection Closed');
        this.wsConnection = null
      })
    })

    this.wsClient.connect(this.wsHost + `/ws?clientId=${this.clientId}`)
  }

  abortWebsocket (): void {
    if (this.wsConnection) {
      this.wsClient.abort()
    }
  }

  async waitingPromptExecution (promptId: string): Promise<PromptResult> {
    return await new Promise((resolve, reject) => {
      if (!this.wsConnection) {
        reject(new Error('ws connection closed'))
        return
      }

      this.wsConnection.on('message', (message) => {
        if (message.type !== 'utf8') {
          return
        }

        try {
          const data = JSON.parse(message.utf8Data) as { type: string, data: any }
          if (!['executed', 'execution_cached_'].includes(data.type)) {
            return
          }

          if (data.data.prompt_id !== promptId) {
            return
          }

          resolve(data as PromptResult)
        } catch (ex) {
          reject(ex)
        }
      })
    })
  }

  async queuePrompt (prompt: any): Promise<QueuePromptResponse> {
    const data = prompt
    const response = await this.httpClient.post<QueuePromptResponse>('/prompt', data, { headers: { 'Content-Type': 'application/json' } })
    return response.data
  }

  async history (promptId: string): Promise<HistoryResponseItem> {
    const response = await this.httpClient.get<HistoryResponse>(`/history/${promptId}`)
    return response.data[promptId]
  }

  async uploadImage (params: { filename: string, fileBuffer: Buffer, override: boolean }): Promise<UploadImageResponse> {
    const formData = new FormData()
    formData.append('image', params.fileBuffer, {
      filename: params.filename,
      contentType: 'image/png'
    })

    formData.append('overwrite', String(params.override))

    const response = await this.httpClient.postForm<UploadImageResponse>('/upload/image', formData)
    return response.data
  }

  async downloadResult (filename: string): Promise<Buffer> {
    const response = await this.httpClient.get<Buffer>(`/view?filename=${filename}&subfolder=&type=output`, { responseType: 'arraybuffer' })
    return response.data
  }
}
