import { Client } from './sd-node-client'
import { MODELS_CONFIGS, getModelByParam, IModel } from './models-config';
import { getParamsFromPrompt, NEGATIVE_PROMPT } from './helpers';

export * from './models-config';

interface IGenImageOptions {
  prompt: string;
  model: IModel;
  seed?: number;
  width?: number;
  height?: number;
}

export class SDNodeApi {
  client: Client;

  constructor() {
    this.client = new Client()
  }

  generateImage = async (options: IGenImageOptions) => {
    const params = getParamsFromPrompt(options.prompt, options.model);

    const { images } = await this.client.txt2img({
      prompt: params.promptWithoutParams,
      negativePrompt: params.negativePrompt,
      width: params.width,
      height: params.height,
      steps: params.steps,
      cfgScale: params.cfgScale,
      addDetailLora: params.addDetailLora,
      seed: options.seed || params.seed,
      model: options.model.path,
      batchSize: 1,
    })

    return images[0];
  }

  generateImageByImage = async (
    options: IGenImageOptions & { fileName: string; fileBuffer: Buffer }
  ) => {
    const params = getParamsFromPrompt(options.prompt, options.model);

    const { images } = await this.client.img2img(
      options.fileBuffer,
      {
        prompt: params.promptWithoutParams,
        negativePrompt: params.negativePrompt,
        width: options.width || params.width,
        height: options.height || params.height,
        steps: params.steps,
        cfgScale: params.cfgScale,
        addDetailLora: params.addDetailLora,
        seed: options.seed || params.seed,
        denoise: params.denoise,
        model: options.model.path,
        batchSize: 1,
        fileName: options.fileName,
        controlnetVersion: params.controlnetVersion
      })

    return images[0];
  }

  generateImagesPreviews = async (options: IGenImageOptions) => {
    const params = {
      prompt: options.prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: options.model.baseModel === 'SDXL 1.0' ? 1024 : 512,
      height: options.model.baseModel === 'SDXL 1.0' ? 1024 : 768,
      steps: 15,
      batchSize: 1,
      cfgScale: 7,
      model: options.model.path
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