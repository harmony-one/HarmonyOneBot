import axios, {AxiosInstance} from "axios";
import FormData from 'form-data';
import {v4 as uuidv4} from 'uuid';
import Websocket from 'websocket';

interface HistoryResponse {
  [key: string]: {
    prompt: any,
    outputs: {
      [key: string]: {
        images: {
          "filename": string,
          "subfolder": string,
          "type": "output"
        }[]
      }
    }
  }
}

interface QueuePromptResponse {
  prompt_id: string,
  number: number,
}

interface UploadImageResponse {
  name: string;
  subfolder: string
  type: "input"
}

interface PromptResult {
  "type": "executed",
  "data": {
    "prompt_id": string
    "node": string,
    "output": {
      "images": [
        {
          "filename": string,
          "subfolder": string,
          "type": string
        }
      ]
    },
  }
}

export class ComfyClient {
  private host: string;
  private wsHost: string;
  private httpClient: AxiosInstance;
  private wsClient: Websocket.client;
  public clientId: string;
  public wsConnection: Websocket.connection | null;

  constructor({host, wsHost}: { host: string, wsHost: string }) {
    this.clientId = uuidv4();
    this.host = host;
    this.wsHost = wsHost;
    this.httpClient = axios.create({baseURL: host});
    this.wsClient = new Websocket.client();
    this.wsConnection = null;
    this.initWebsocket();
  }

  initWebsocket() {
    this.wsClient.on('connectFailed', function (error) {
      console.log('Connect Error: ' + error.toString());
    });

    this.wsClient.on('connect', (connection) => {
      this.wsConnection = connection;

      console.log('WebSocket Client Connected');
      connection.on('error', (error) => {
        console.log("Connection Error: " + error.toString());
      });
      connection.on('close', () => {
        console.log('Connection Closed');
        this.wsConnection = null;
      });

      connection.on('message', function (message) {
        if (message.type === 'utf8') {

          try {
            console.log('### message.utf8Data', message.utf8Data);
            const m = JSON.parse(message.utf8Data);
            if (m.type === 'executed') {

            }
          } catch (ex) {

          }
        }
      });
    });

    this.wsClient.connect(this.wsHost + `/ws?clientId=${this.clientId}`);
  }

  async waitingPromptExecution(prompt_id: string): Promise<PromptResult> {
    return new Promise((resolve, reject) => {
      if (!this.wsConnection) {
        reject('ws connection closed');
        return;
      }

      this.wsConnection.on('message', (message) => {
        if (message.type !== 'utf8') {
          return;
        }

        try {
          const data = JSON.parse(message.utf8Data) as {type: string, data: any};
          if (data.type !== 'executed') {
            return;
          }

          if (data.data.prompt_id !== prompt_id) {
            return;
          }

          resolve(data as PromptResult);
        } catch (ex) {
          reject(ex);
        }
      })
    });
  }

  async queuePrompt(prompt: any) {
    const data = prompt;
    const response = await this.httpClient.post<QueuePromptResponse>('/prompt', data, {headers: {'Content-Type': 'application/json'}});
    return response.data;
  }

  async history(promptId: string) {
    const response = await this.httpClient.get<HistoryResponse>(`/history/${promptId}`);
    return response.data[promptId];
  }

  async uploadImage(filename: string, file: Buffer) {
    const formData = new FormData();
    formData.append('image', file, {
      filename,
      contentType: 'image/png'
    });

    const response = await this.httpClient.postForm<UploadImageResponse>('/upload/image', formData);
    return response.data;
  }

  async downloadResult(filename: string) {
    const response = await this.httpClient.get<Buffer>(`/view?filename=${filename}&subfolder=&type=output`, {responseType: 'arraybuffer'});
    return response.data;
  }
}