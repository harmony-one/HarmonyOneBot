import { Client } from './sd-node-client'
import { MODELS_CONFIGS, getModelByParam, IModel, modelsAliases } from './models-config';
import { getLoraByParam, ILora } from './loras-config';
import { getParamsFromPrompt, NEGATIVE_PROMPT } from './helpers';
import { OnMessageContext, OnCallBackQueryData } from "../../types";

export * from './models-config';

interface IGenImageOptions {
  prompt: string;
  model: IModel;
  lora?: ILora;
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

    let selectedLora;
    let loraStrength;

    if (options.lora) {
      selectedLora = options.lora;
      loraStrength = 1;
    } else if (params.loraName) {
      selectedLora = getLoraByParam(params.loraName, options.model.baseModel);
      loraStrength = params.loraStrength;

      //For trained Loras
      if (!selectedLora) {
        selectedLora = {
          path: `${params.loraName}.safetensors`,
          name: params.loraName
        } as ILora;

        params.promptWithoutParams = `${params.loraName}, ${params.promptWithoutParams}`;
      }
    }

    if (selectedLora?.shortName === 'logo') {
      params.promptWithoutParams = `logo, ${params.promptWithoutParams}, LogoRedAF`;
    }

    const { images } = await this.client.txt2img({
      prompt: params.promptWithoutParams,
      negativePrompt: params.negativePrompt,
      width: params.width,
      height: params.height,
      steps: params.steps,
      cfgScale: params.cfgScale,
      loraPath: selectedLora?.path,
      loraName: params.loraName,
      loraStrength,
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

    let selectedLora: ILora | undefined;
    let loraStrength;

    if (options.lora) {
      selectedLora = options.lora;
      loraStrength = 1;
    } else if (params.loraName) {
      selectedLora = getLoraByParam(params.loraName, options.model.baseModel);
      loraStrength = params.loraStrength;

      //For trained Loras
      if (!selectedLora) {
        selectedLora = {
          path: `${params.loraName}.safetensors`,
          name: params.loraName
        } as ILora;

        params.promptWithoutParams = `${params.loraName}, ${params.promptWithoutParams}`;
      }
    }

    if (selectedLora?.shortName === 'logo') {
      params.promptWithoutParams = `logo, ${params.promptWithoutParams}, LogoRedAF`;
    }

    const { images } = await this.client.img2img(
      options.fileBuffer,
      {
        prompt: params.promptWithoutParams,
        negativePrompt: params.negativePrompt,
        width: options.width || params.width,
        height: options.height || params.height,
        steps: params.steps,
        cfgScale: params.cfgScale,
        loraPath: selectedLora?.path,
        loraName: params.loraName,
        loraStrength,
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

  train = async (
    fileBuffers: Buffer[],
    prompt: string,
    ctx: OnMessageContext | OnCallBackQueryData,
  ): Promise<void> => {
    const params = getParamsFromPrompt(prompt);

    const [loraName] = prompt.split(' ');

    return this.client.train(fileBuffers, loraName, params.modelAlias, ctx);
  }
}