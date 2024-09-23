import config from './config'
import { LlmModelsEnum } from './modules/llms/utils/llmModelsManager'
import { type DalleImageSize } from './modules/llms/utils/types'
import { type BotSessionData } from './modules/types'
import { marked } from 'marked'
import { parse as parseHtml, HTMLElement } from 'node-html-parser'
export function createInitialSessionData (): BotSessionData {
  return {
    oneCountry: { lastDomain: '' },
    translate: {
      languages: [],
      enable: false
    },
    collections: {
      activeCollections: [],
      collectionRequestQueue: [],
      isProcessingQueue: false,
      currentCollection: '',
      collectionConversation: []
    },
    subagents: { running: [], subagentsRequestQueue: [], isProcessingQueue: false },
    llms: {
      model: config.llms.model,
      isEnabled: config.llms.isEnabled,
      chatConversation: [],
      price: 0,
      usage: 0,
      isProcessingQueue: false,
      requestQueue: []
    },
    chatGpt: {
      model: config.llms.model,
      isEnabled: config.llms.isEnabled,
      isFreePromptChatGroups: config.openAi.chatGpt.isFreePromptChatGroups,
      chatConversation: [],
      price: 0,
      usage: 0,
      isProcessingQueue: false,
      requestQueue: []
    },
    dalle: {
      numImages: config.openAi.dalle.sessionDefault.numImages,
      imgSize: config.openAi.dalle.sessionDefault.imgSize as DalleImageSize,
      isEnabled: config.openAi.dalle.isEnabled,
      imgRequestQueue: [],
      isProcessingQueue: false,
      imageGenerated: [],
      isInscriptionLotteryEnabled: config.openAi.dalle.isInscriptionLotteryEnabled,
      imgInquiried: []
    },
    voiceMemo: {
      isOneTimeForwardingVoiceEnabled: false,
      isVoiceForwardingEnabled: config.voiceMemo.isVoiceForwardingEnabled
    },
    currentModel: LlmModelsEnum.GPT_4O,
    lastBroadcast: ''
  }
}

type AllowedAttributesType = Record<string, string[]>

function sanitizeHtml (html: string): string {
  const allowedTags = [
    'b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del',
    'span', 'tg-spoiler', 'a', 'code', 'pre', 'tg-emoji', 'blockquote'
  ]
  const allowedAttributes: AllowedAttributesType = {
    a: ['href'],
    span: ['class'],
    'tg-emoji': ['emoji-id'],
    pre: ['class'],
    code: ['class'],
    blockquote: ['expandable']
  }
  const root = parseHtml(html)

  function walk (node: HTMLElement): void {
    if (node.nodeType === 1 && node.tagName) { // ELEMENT_NODE with a tagName
      const tagName = node.tagName.toLowerCase()
      if (!allowedTags.includes(tagName)) {
        const children = node.childNodes
        node.replaceWith(...children)
        children.forEach(child => {
          if (child instanceof HTMLElement) {
            walk(child)
          }
        })
        return
      } else {
        // Remove disallowed attributes
        const allowedAttrs = allowedAttributes[tagName] || []
        const attributes = node.attributes
        Object.keys(attributes).forEach(attrName => {
          if (!allowedAttrs.includes(attrName)) {
            node.removeAttribute(attrName)
          }
        })
        // Special case for span with tg-spoiler class
        if (tagName === 'span' && node.getAttribute('class') !== 'tg-spoiler') {
          node.removeAttribute('class')
        }
      }
    }
    node.childNodes.forEach(child => {
      if (child instanceof HTMLElement) {
        walk(child)
      }
    })
  }

  walk(root)
  return root.toString()
}

export async function markdownToTelegramHtml (text: string): Promise<string> {
  try {
    const html = await marked(text)
    return sanitizeHtml(html)
  } catch (error) {
    console.error('Error parsing markdown:', error)
    return text // Return original text if parsing fails
  }
}

export async function addQuotePrefix (text: string): Promise<string> {
  if (!text) return ''
  const htmlText = await markdownToTelegramHtml(text)
  return `<blockquote>${htmlText}</blockquote>`
}
