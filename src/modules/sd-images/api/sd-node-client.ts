import { ComfyClient } from '../../qrcode/comfy/ComfyClient'
import { type OnMessageContext, type OnCallBackQueryData } from '../../types'
import config from '../../../config'
import { sleep } from '../utils'
import {
  buildImgPromptLora,
  buildImgPrompt,
  buildImg2ImgLoraPrompt,
  buildImg2ImgPrompt,
  buildImg2ImgControlnetPrompt,
  buildImg2ImgControlnetV2Prompt,
  type Txt2ImgOptions,
  type Img2ImgOptions
} from './configs'
import { NEGATIVE_PROMPT, waitingExecute } from './helpers'
import axios from 'axios'

export interface Txt2ImgResponse {
  images: Buffer[]
  parameters: object
  all_seeds: string[]
  info: string
}

const getRandomSeed = () => Math.round(Math.random() * 1e15)

export class Client {
  constructor () { }

  txt2img = async (options: Txt2ImgOptions, serverConfig?: { host: string, wsHost: string }): Promise<Txt2ImgResponse> => {
    const comfyClient = new ComfyClient({
      host: config.comfyHost,
      wsHost: config.comfyWsHost,
      ...serverConfig
    })

    try {
      let attempts = 3

      while (attempts > 0 && !comfyClient.wsConnection) {
        await sleep(1000)
        attempts--
      }

      const seed = options.seed || getRandomSeed()

      const buildImgPromptMethod = options.loraPath ? buildImgPromptLora : buildImgPrompt

      const prompt = buildImgPromptMethod({
        ...options,
        seed,
        clientId: comfyClient.clientId
      })

      const r = await comfyClient.queuePrompt(prompt)

      const promptResult = await waitingExecute(async () => await comfyClient.waitingPromptExecution(r.prompt_id), 1000 * 180)

      const history = await comfyClient.history(r.prompt_id)

      const images = await Promise.all(
        history.outputs['9'].images.map(async img => await comfyClient.downloadResult(img.filename))
      )

      comfyClient.abortWebsocket()

      return {
        images,
        parameters: {},
        all_seeds: [String(seed)],
        info: ''
      } as Txt2ImgResponse
    } catch (e) {
      comfyClient.abortWebsocket()
      throw e
    }
  }

  img2img = async (
    fileBuffer: Buffer,
    options: Img2ImgOptions,
    serverConfig?: { host: string, wsHost: string }
  ): Promise<Txt2ImgResponse> => {
    const comfyClient = new ComfyClient({
      host: config.comfyHost,
      wsHost: config.comfyWsHost,
      ...serverConfig
    })

    try {
      let attempts = 3

      while (attempts > 0 && !comfyClient.wsConnection) {
        await sleep(1000)
        attempts--
      }

      const seed = options.seed || getRandomSeed()

      const filename = Date.now() + '.png'

      const uploadResult = await comfyClient.uploadImage({ filename, fileBuffer, override: true })

      let prompt

      if (options.loraPath) {
        prompt = buildImg2ImgLoraPrompt({
          ...options,
          seed,
          clientId: comfyClient.clientId,
          fileName: uploadResult.name,
          steps: 30,
          denoise: 1,
          cfgScale: 8
        })
      } else {
        switch (options.controlnetVersion) {
          case 1:
            prompt = buildImg2ImgPrompt({
              ...options,
              seed,
              clientId: comfyClient.clientId,
              fileName: uploadResult.name
            })
            break

          case 2:
            prompt = buildImg2ImgControlnetPrompt({
              ...options,
              seed,
              clientId: comfyClient.clientId,
              fileName: uploadResult.name
            })
            break

          case 3:
            prompt = buildImg2ImgControlnetV2Prompt({
              ...options,
              seed,
              clientId: comfyClient.clientId,
              fileName: uploadResult.name,
              cfgScale: 7
            })
            break
        }
      }

      const r = await comfyClient.queuePrompt(prompt)

      const promptResult = await waitingExecute(async () => await comfyClient.waitingPromptExecution(r.prompt_id), 1000 * 180)

      const history = await comfyClient.history(r.prompt_id)

      const images = await Promise.all(
        history.outputs['9'].images.map(async img => await comfyClient.downloadResult(img.filename))
      )

      comfyClient.abortWebsocket()

      return {
        images,
        parameters: {},
        all_seeds: [String(seed)],
        info: ''
      } as Txt2ImgResponse
    } catch (e) {
      comfyClient.abortWebsocket()
      throw e
    }
  }

  train = async (
    fileBuffers: Buffer[],
    loraName: string,
    modelAlias: string,
    ctx: OnMessageContext | OnCallBackQueryData,
    serverConfig?: { host: string, wsHost: string }
  ): Promise<void> => {
    const comfyClient = new ComfyClient({
      host: config.comfyHost,
      wsHost: config.comfyWsHost,
      ...serverConfig
    })

    // TODO
    const trainServer = config.comfyHost.split(':')[0] + ':7860'

    try {
      let attempts = 3

      while (attempts > 0 && !comfyClient.wsConnection) {
        await sleep(1000)
        attempts--
      }

      if (!fileBuffers.length) {
        ctx.reply(`No files found for ${loraName}`)
        throw new Error('No files found')
      }

      for (let i = 0; i < fileBuffers.length; i++) {
        const filename = `${loraName}_${i}.png`

        await comfyClient.uploadImage({ filename, fileBuffer: fileBuffers[i], override: true })
      }

      const modelPath = modelAlias || 'base'

      let res = await axios.get(`${trainServer}/add/${loraName}/${modelPath}`)
      let train = res.data

      ctx.reply(`Starting training with ${fileBuffers.length} images, your number is ${train.numberInQueue}`)

      while (train.status === 'IN_PROGRESS' || train.status === 'WAITING') {
        await sleep(1000)

        res = await axios.get(`${trainServer}/status/${loraName}`)
        train = res.data
      }

      if (train.status === 'ERROR' || train.status === 'CANCELED') {
        throw new Error(`Training finished with ${train.status} status`)
      }

      ctx.reply(`Training for <lora:${loraName}:1> completed successfully`)

      comfyClient.abortWebsocket()
    } catch (e) {
      comfyClient.abortWebsocket()
      throw e
    }
  }
}
