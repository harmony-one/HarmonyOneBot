import { InputFile } from 'grammy'
import config from '../../config'
import { ElevenlabsClient } from '../../elevenlabs/elevenlabsClient'
import { type OnMessageContext } from '../types'

export const generateVoiceFromText = async (text: string, voiceId = '21m00Tcm4TlvDq8ikWAM'): Promise<string | Uint8Array | null | undefined> => {
  const elevenlabsClient = new ElevenlabsClient(config.elevenlabs.apiKey)

  const voiceResult = await elevenlabsClient.textToSpeech({ text, voiceId })

  return voiceResult
}

export const responseWithVoice = async (text: string, ctx: OnMessageContext, msgId: number, voiceId = '21m00Tcm4TlvDq8ikWAM'): Promise<void> => {
  const voiceResult = await generateVoiceFromText(text, voiceId)

  if (!voiceResult) {
    await ctx.reply('voice generation error')
    return
  }

  await ctx.api.deleteMessage(ctx.chat.id, msgId)

  const inputFile = new InputFile(voiceResult)

  await ctx.replyWithVoice(inputFile)
}
