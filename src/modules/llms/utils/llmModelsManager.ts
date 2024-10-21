import { llmData } from './llmsData'
import {
  type Provider,
  type LLMData,
  type LLMModel,
  type ImageModel,
  type ModelParameters
} from './types'

export class LLMModelsManager {
  private readonly models = new Map<string, LLMModel>()
  private readonly modelsEnum: Record<string, string>
  private readonly commandsEnum: Record<string, string>

  constructor (llmData: LLMData) {
    this.loadModels(llmData)
    this.modelsEnum = this.createModelsEnum()
    this.commandsEnum = this.createCommandsEnum()
  }

  private loadModels (data: LLMData): void {
    Object.values(data.chatModels).forEach(model => { this.addModel(model) })
    Object.values(data.imageModels).forEach(model => { this.addModel(model) })
  }

  addModel (model: LLMModel): void {
    this.models.set(model.version, model)
  }

  private createModelsEnum (): Record<string, string> {
    const modelsEnum: Record<string, string> = {}
    this.models.forEach(model => {
      const key = this.sanitizeEnumKey(model.name)
      modelsEnum[key] = model.version
    })
    return modelsEnum
  }

  private createCommandsEnum (): Record<string, string> {
    const commandsEnum: Record<string, string> = {}
    this.models.forEach(model => {
      model.commands.forEach(command => {
        const key = this.sanitizeEnumKey(command)
        commandsEnum[key] = command
      })
    })
    return commandsEnum
  }

  getModel (version: string): LLMModel | undefined {
    return this.models.get(version)
  }

  getAllModels (): LLMModel[] {
    return Array.from(this.models.values())
  }

  getModelsByProvider<T extends LLMModel = LLMModel>(provider: Provider): T[] {
    return this.getAllModels().filter(model => model.provider === provider) as T[]
  }

  getModelsByBot<T extends LLMModel = LLMModel>(botName: string): T[] {
    return this.getAllModels().filter(model => model.botName === botName) as T[]
  }

  // Add a new method specifically for image models
  getImageModelsByProvider (provider: Provider): ImageModel[] {
    return this.getModelsByProvider<ImageModel>(provider)
  }

  getCommandsByProvider (provider: Provider): string[] {
    let commands: string[] = []
    this.models.forEach(model => {
      if (model.provider === provider) {
        commands = [...commands, ...model.commands]
      }
    })
    return commands
  }

  getCommandsByBot (botName: string): string[] {
    let commands: string[] = []
    this.models.forEach(model => {
      if (model.botName === botName) {
        commands = [...commands, ...model.commands]
      }
    })
    return commands
  }

  getModelsEnum (): Record<string, string> & {
    [K in keyof typeof this.modelsEnum]: (typeof this.modelsEnum)[K]
  } {
    return new Proxy(this.modelsEnum, {
      get (target, prop) {
        if (typeof prop === 'string' && prop in target) {
          return target[prop]
        }
        throw new Error(`Invalid model: ${String(prop)}`)
      }
    }) as any
  }

  getCommandsEnum (): Record<string, string> & {
    [K in keyof typeof this.commandsEnum]: (typeof this.commandsEnum)[K]
  } {
    return new Proxy(this.commandsEnum, {
      get (target, prop) {
        if (typeof prop === 'string' && prop in target) {
          return target[prop]
        }
        throw new Error(`Invalid command: ${String(prop)}`)
      }
    }) as any
  }

  getModelParameters (modelVersion: string): ModelParameters {
    const model = this.getModel(modelVersion)
    if (!model) {
      throw new Error(`Model ${modelVersion} not found`)
    }
    const providerParams = llmData.providerParameters[model.provider]
    const modelOverrides = providerParams.modelOverrides?.[model.name] ?? {}

    return {
      ...providerParams.defaultParameters,
      ...modelOverrides
    }
  }

  isValidModel (model: string): model is (typeof this.modelsEnum)[keyof typeof this.modelsEnum] {
    return Object.values(this.modelsEnum).includes(model)
  }

  isValidCommand (command: string): command is (typeof this.commandsEnum)[keyof typeof this.commandsEnum] {
    return Object.values(this.commandsEnum).includes(command)
  }

  getCommandsByModel (version: string): string[] | undefined {
    return this.models.get(version)?.commands
  }

  getPrefixByModel (version: string): string[] | undefined {
    return this.models.get(version)?.prefix
  }

  generateTelegramOutput (): string {
    let output = ''
    const providers = Array.from(new Set(this.getAllModels().map(model => model.provider)))
    for (const provider of providers) {
      output += `*${provider.toUpperCase()} models:*\n`
      this.getModelsByProvider(provider).forEach(model => {
        if (model.commands.length > 0) {
          output += `${model.fullName}: [${model.version}](${model.apiSpec})\n`
          output += `Commands: _/${model.commands.join(' /')}_\n`
          if (model.prefix) {
            output += `Shortcuts: _${model.prefix.join(' ')}_\n\n`
          } else {
            output += '\n'
          }
        }
      })
    }
    return output.trim()
  }

  private sanitizeEnumKey (key: string): string {
    // Replace spaces and special characters with underscores
    return key.replace(/[\s-]+/g, '_').replace(/[^\w]+/g, '').toUpperCase()
  }
}

export const llmModelManager = new LLMModelsManager(llmData)

export const LlmModelsEnum = llmModelManager.getModelsEnum()
export type ModelVersion = (typeof LlmModelsEnum)[keyof typeof LlmModelsEnum]

export const LlmCommandsEnum = llmModelManager.getCommandsEnum()
export type ModelCommand = (typeof LlmCommandsEnum)[keyof typeof LlmCommandsEnum]

export const isValidModel = llmModelManager.isValidModel.bind(llmModelManager)
export const isValidCommand = llmModelManager.isValidCommand.bind(llmModelManager)

// console.log(LlmModelsEnum)
// console.log(LlmCommandsEnum)
// Helper type for IntelliSense
export type LlmModelsEnumType = typeof LlmModelsEnum
