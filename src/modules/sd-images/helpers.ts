import { type OnCallBackQueryData, type OnMessageContext } from '../types'
import { getModelByParam, type IModel, MODELS_CONFIGS } from './api'
import { getLoraByParam, type ILora } from './api/loras-config'
import { childrenWords, sexWords } from './words-blacklist'

export enum COMMAND {
  TEXT_TO_IMAGE = 'image',
  IMAGE_TO_IMAGE = 'img2img',
  TEXT_TO_IMAGES = 'images',
  CONSTRUCTOR = 'constructor',
  HELP = 'help',
  TRAIN = 'train'
}

export interface IOperation {
  command: COMMAND
  prompt: string
  model: IModel
  lora?: ILora
}

export interface IMediaGroup {
  media_group_id: string
  photos_ids: string[]
}

const removeSpaceFromBegin = (text: string): string => {
  if (!text) return ''

  let idx = 0

  // const regex = /^[a-zA-Z\d]$/;

  while (!!text[idx] && text[idx] === ' ') idx++

  return text.slice(idx)
}

const SPECIAL_IMG_CMD_SYMBOLS = [',', 'i.', 'l.', 'I.']

const parsePrompts = (fullText: string): { modelId: string, prompt: string } => {
  let modelId = ''
  let prompt: any

  let text = fullText

  const specialSymbols = ['/', ...SPECIAL_IMG_CMD_SYMBOLS]

  if (specialSymbols.some(s => !!text.startsWith(s))) {
    const startIdx = text.indexOf(' ')
    text = startIdx > -1 ? text.slice(startIdx) : ''
  }

  try {
    const startIdx = text.indexOf('--model=')
    const endIdx = text.indexOf(' ', startIdx)

    if (startIdx > -1) {
      prompt = text.split('')
      const modelParamStr = prompt.splice(startIdx, endIdx - startIdx)

      prompt = prompt.join('')
      prompt = removeSpaceFromBegin(prompt)

      modelId = modelParamStr.join('').split('=')[1].replace(/[^a-zA-Z\-_\d]/g, '')
    } else {
      prompt = removeSpaceFromBegin(text)
    }
  } catch (e) {
    console.log('Warning: sd images parse prompts', e)
  }

  // console.log({ modelId, prompt });

  return { modelId, prompt }
}

type Context = OnMessageContext | OnCallBackQueryData

const hasCommand = (ctx: Context, cmd: string): boolean | undefined => ctx.hasCommand(cmd) || (ctx.message?.text?.startsWith(`${cmd} `) && ctx.chat?.type === 'private')

export const parseCtx = (ctx: Context): IOperation | false => {
  try {
    let messageText = ctx.message?.text

    if (!messageText && !!ctx.message?.photo?.length) {
      messageText = ctx.message?.caption
    }

    if (!messageText) {
      return false
    }

    let {
      modelId,
      prompt
    } = parsePrompts(messageText)

    let model = getModelByParam(modelId)
    let command
    let lora

    if (
      (hasCommand(ctx, 'image') ?? hasCommand(ctx, 'imagine')) ?? hasCommand(ctx, 'img')
    ) {
      command = COMMAND.TEXT_TO_IMAGE
    }

    if (
      hasCommand(ctx, 'logo') ?? hasCommand(ctx, 'l')
    ) {
      command = COMMAND.TEXT_TO_IMAGE
      model = model ?? getModelByParam('xl')
      lora = getLoraByParam('logo', model?.baseModel ?? 'SDXL 1.0')
    }

    if (hasCommand(ctx, 'images')) {
      command = COMMAND.TEXT_TO_IMAGES
    }

    // if (ctx.hasCommand('all')) {
    //     command = COMMAND.CONSTRUCTOR;
    // }

    if (ctx.hasCommand('sd')) {
      command = COMMAND.HELP
    }

    if (ctx.hasCommand('train')) {
      command = COMMAND.TRAIN
    }

    const startWithCmdSymbol = !!messageText?.startsWith('/')

    if (startWithCmdSymbol) {
      const cmd = String(messageText?.slice(1).split(' ')[0])
      const modelFromCmd = getModelByParam(cmd)

      if (modelFromCmd) {
        command = COMMAND.TEXT_TO_IMAGE
        model = modelFromCmd
      }
    }

    const startWithSpecialSymbol = SPECIAL_IMG_CMD_SYMBOLS.some(s => !!messageText?.startsWith(s))

    if (startWithSpecialSymbol) {
      command = COMMAND.TEXT_TO_IMAGE
    }

    if (messageText.startsWith('l.')) {
      model = getModelByParam('xl')
      lora = getLoraByParam('logo', model?.baseModel ?? 'SDXL 1.0')
    }

    if (!model) {
      model = MODELS_CONFIGS[0]
    }

    if (!prompt) {
      prompt = model.defaultPrompt

      if (lora?.shortName === 'logo') {
        prompt = 'A bunny is sitting in a kimono'
      }
    }

    const messageHasPhoto = !!ctx.message?.photo?.length ||
            !!ctx.message?.reply_to_message?.photo?.length

    if (command === COMMAND.TEXT_TO_IMAGE && messageHasPhoto) {
      command = COMMAND.IMAGE_TO_IMAGE

      // TODO: img + lora + controlneet  don't support Xl
      if (lora && model.baseModel !== 'SD 1.5') {
        model = getModelByParam('rev') ?? MODELS_CONFIGS[0]
      }
    }

    if (command) {
      return {
        command,
        model,
        lora,
        prompt
      }
    }
  } catch (e) {
    console.log('Error: SD images parse prompts', e)
  }

  return false
}

export const promptHasBadWords = (prompt: string): boolean => {
  const lowerCasePrompt = prompt.toLowerCase()

  const hasChildrenWords = childrenWords.some(
    word => lowerCasePrompt.includes(word.toLowerCase())
  )

  const hasSexWords = sexWords.some(
    word => lowerCasePrompt.includes(word.toLowerCase())
  )

  // const hasTabooWords = tabooWords.some(
  //     word => lowerCasePrompt.includes(word.toLowerCase())
  // );

  return hasChildrenWords && hasSexWords
}
