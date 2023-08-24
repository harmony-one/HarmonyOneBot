import { Client } from './sd-node-client'
import { MODELS_CONFIGS, getModelByParam, IModel } from './models-config';

const NEGATIVE_PROMPT = '(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation';

export class SDNodeApi {
  client: Client;

  constructor() {
    this.client = new Client()
  }

  generateImage = async (prompt: string, model: IModel, seed?: number) => {
    const { images } = await this.client.txt2img({
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: model.baseModel === 'SDXL 1.0' ? 1024 : 512,
      height: model.baseModel === 'SDXL 1.0' ? 1024 : 768,
      steps: 26,
      batchSize: 1,
      cfgScale: 7,
      seed,
      model: model.path
    })

    return images[0];
  }

  generateImagesPreviews = async (prompt: string, model: IModel) => {
    const params = {
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: model.baseModel === 'SDXL 1.0' ? 1024 : 512,
      height: model.baseModel === 'SDXL 1.0' ? 1024 : 768,
      steps: 15,
      batchSize: 1,
      cfgScale: 7,
      model: model.path
    };

    const res = await Promise.all([
      this.client.txt2img(params),
      this.client.txt2img(params),
      this.client.txt2img(params),
      this.client.txt2img(params)
    ]);

    return {
      images: res.map(r => r.images[0]),
      parameters: {},
      all_seeds: res.map(r => r.all_seeds[0]),
      info: ''
    };
  }
}