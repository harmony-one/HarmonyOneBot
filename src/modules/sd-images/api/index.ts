import { Client } from './sd-node-client'
import { type IModel } from './models-config'
import { getLoraByParam, type ILora } from './loras-config'
import { getParamsFromPrompt, NEGATIVE_PROMPT } from './helpers'
import { type OnMessageContext, type OnCallBackQueryData } from '../../types'
import config from '../../../config'

export * from './models-config'

interface IGenImageOptions {
  prompt: string
  model: IModel
  lora?: ILora
  seed?: number
  width?: number
  height?: number
}

export class SDNodeApi {
  client: Client

  constructor () {
    this.client = new Client()
  }

  generateImage = async (options: IGenImageOptions): Promise<Buffer> => {
    const params = getParamsFromPrompt(options.prompt, options.model)

    let selectedLora
    let loraStrength

    if (options.lora) {
      selectedLora = options.lora
      loraStrength = 1
    } else if (params.loraName) {
      selectedLora = getLoraByParam(params.loraName, options.model.baseModel)
      loraStrength = params.loraStrength

      // For trained Loras
      if (!selectedLora) {
        // eslint-disable-next-line
        selectedLora = {
          path: `${params.loraName}.safetensors`,
          name: params.loraName
        } as ILora

        params.promptWithoutParams = `${params.loraName}, ${params.promptWithoutParams}`
      }
    }

    if (selectedLora?.shortName === 'logo') {
      params.promptWithoutParams = `logo, ${params.promptWithoutParams}, LogoRedAF`
    }

    let serverConfig;

    if (options.model.serverNumber === 2) {
      serverConfig = {
        host: config.comfyHost2,
        wsHost: config.comfyWsHost2,
      }
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
      seed: options.seed ?? params.seed,
      model: options.model.path,
      batchSize: 1
    }, serverConfig)

    return images[0]
  }

  generateImageByImage = async (
    options: IGenImageOptions & { fileName: string, fileBuffer: Buffer }
  ): Promise<Buffer> => {
    const params = getParamsFromPrompt(options.prompt, options.model)

    let selectedLora: ILora | undefined
    let loraStrength

    if (options.lora) {
      selectedLora = options.lora
      loraStrength = 1
    } else if (params.loraName) {
      selectedLora = getLoraByParam(params.loraName, options.model.baseModel)
      loraStrength = params.loraStrength

      // For trained Loras
      if (!selectedLora) {
        // eslint-disable-next-line
        selectedLora = {
          path: `${params.loraName}.safetensors`,
          name: params.loraName
        } as ILora

        params.promptWithoutParams = `${params.loraName}, ${params.promptWithoutParams}`
      }
    }

    if (selectedLora?.shortName === 'logo') {
      params.promptWithoutParams = `logo, ${params.promptWithoutParams}, LogoRedAF`
    }

    const { images } = await this.client.img2img(
      options.fileBuffer,
      {
        prompt: params.promptWithoutParams,
        negativePrompt: params.negativePrompt,
        width: options.width ?? params.width,
        height: options.height ?? params.height,
        steps: params.steps,
        cfgScale: params.cfgScale,
        loraPath: selectedLora?.path,
        loraName: params.loraName,
        loraStrength,
        seed: options.seed ?? params.seed,
        denoise: params.denoise,
        model: options.model.path,
        batchSize: 1,
        fileName: options.fileName,
        controlnetVersion: params.controlnetVersion
      })

    return images[0]
  }

  generateImagesPreviews: (options: IGenImageOptions) => Promise<{ images: Buffer[], all_seeds: string[], parameters: unknown, info: string }> = async (options: IGenImageOptions) => {
    const params = {
      prompt: options.prompt,
      negativePrompt: NEGATIVE_PROMPT,
      width: options.model.baseModel === 'SDXL 1.0' ? 1024 : 512,
      height: options.model.baseModel === 'SDXL 1.0' ? 1024 : 768,
      steps: 15,
      batchSize: 1,
      cfgScale: 7,
      model: options.model.path
    }

    const res = await Promise.all([
      this.client.txt2img(params),
      this.client.txt2img(params),
      this.client.txt2img(params),
      this.client.txt2img(params)
    ])

    return {
      images: res.map(r => r.images[0]),
      parameters: {},
      all_seeds: res.map(r => r.all_seeds[0]),
      info: ''
    }
  }

  train = async (
    fileBuffers: Buffer[],
    prompt: string,
    ctx: OnMessageContext | OnCallBackQueryData
  ): Promise<void> => {
    const params = getParamsFromPrompt(prompt)

    const [loraName] = prompt.split(' ')

    await this.client.train(fileBuffers, loraName, params.modelAlias, ctx)
  }
}
