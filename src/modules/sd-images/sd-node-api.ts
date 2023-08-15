// import sdwebui, { Client, SamplingMethod } from 'node-sd-webui'
import { Client } from './sd-node-client'

const NEGATIVE_PROMPT = 'ugly, deformed, watermark';

export class SDNodeApi {
  client: Client;

  constructor() {
    this.client = new Client()
  }

  generateImage = async (prompt: string) => {
    const { images } = await this.client.txt2img({
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: 1024,
      height: 1024,
      steps: 30,
      batchSize: 1,
    })

    return images[0]; // Buffer.from(images[0], 'base64');
  }

  generateImageFull = async (prompt: string, seed: number) => {
    const { images } = await this.client.txt2img({
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: 1024,
      height: 1024,
      steps: 30,
      batchSize: 1,
      cfgScale: 7,
      seed
    })

    return images[0];
  }

  generateImagesPreviews = async (prompt: string) => {
    const res = await this.client.txt2img({
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: 1024,
      height: 1024,
      steps: 15,
      batchSize: 4,
      cfgScale: 10,
    })

    return res;
  }
}