export type Provider = 'openai' | 'claude' | 'vertex' // | 'palm' | 'jurassic'
export type ChargeType = 'TOKEN' | 'CHAR'

export type DalleImageSize = '1024x1024' | '1024x1792' | '1792x1024'

type ImagePrice = Record<DalleImageSize, number>

interface BaseModel {
  provider: Provider
  name: string
  fullName: string
  botName: string
  version: string
  commands: string[]
  prefix?: string[]
  apiSpec: string
}
export interface ModelParameters {
  temperature?: number
  max_tokens?: number
  max_completion_tokens?: number
  system?: string
}

export interface ProviderParameters {
  defaultParameters: ModelParameters
  modelOverrides?: Record<string, Partial<ModelParameters>>
}

export interface ChatModel extends BaseModel {
  inputPrice: number
  outputPrice: number
  maxContextTokens: number
  chargeType: ChargeType
  stream: boolean
}

export interface ImageModel extends BaseModel {
  apiSpec: string
  price: ImagePrice
}

export type LLMModel = ChatModel | ImageModel

export interface LLMData {
  chatModels: Record<string, ChatModel>
  imageModels: Record<string, ImageModel>
  providerParameters: Record<Provider, ProviderParameters>
}

export interface ParseDate {
  month: number
  year: number
  monthName: string
}
