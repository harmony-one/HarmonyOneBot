// import sdwebui, { Client, SamplingMethod } from 'node-sd-webui'
import { Client, MODELS_CONFIG, MODEL_TYPE } from './sd-node-client'
import config from "../../config";

const NEGATIVE_PROMPT = '(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation';

export class SDNodeApi {
  client: Client;

  constructor() {
    this.client = new Client()
  }

  generateImage = async (prompt: string, modelType: MODEL_TYPE) => {
    const { images } = await this.client.txt2img({
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: 512,
      height: 768,
      steps: 26,
      batchSize: 1,
      cfgScale: 7,
      model: MODELS_CONFIG[modelType].path
    })

    return images[0]; // Buffer.from(images[0], 'base64');
  }

  generateImageFull = async (prompt: string, seed: number) => {
    const { images } = await this.client.txt2img({
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: 512,
      height: 768,
      steps: 26,
      batchSize: 1,
      cfgScale: 10,
      seed
    })

    return images[0];
  }

  generateImagesPreviews = async (prompt: string) => {
    const params = {
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: 512,
      height: 768,
      steps: 15,
      batchSize: 1,
      cfgScale: 10,
      model: MODELS_CONFIG.deliberate_v2.path
    };

    const serverConfig = {
      host: config.comfyHost2,
      wsHost: config.comfyWsHost2
    };

    const res = await Promise.all([
      this.client.txt2img(params, serverConfig),
      this.client.txt2img(params, serverConfig),
      this.client.txt2img(params, serverConfig),
      this.client.txt2img(params, serverConfig)
    ]);

    return {
      images: res.map(r => r.images[0]),
      parameters: {},
      all_seeds: res.map(r => r.all_seeds[0]),
      info: ''
    };
  }
}