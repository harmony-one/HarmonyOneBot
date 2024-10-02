export type Provider = 'openai' | 'claude' | 'vertex' | 'palm' | 'jurassic'
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
}

interface ModelCommandConfig {
  model: string
  useTools: boolean
  stream: boolean
}

export interface ModelCommandMap extends Record<string, ModelCommandConfig> {}

interface ModelPrefixConfig {
  model: string
  stream: boolean
}

export interface ModelPrefixMap extends Record<string, ModelPrefixConfig> {}
