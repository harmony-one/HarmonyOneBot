import { type Txt2ImgOptions } from './types'

export interface Img2ImgOptions extends Txt2ImgOptions {
  denoise?: number
  fileName: string
  controlnetVersion: number
}

export function buildImg2ImgPrompt (options: Img2ImgOptions & {
  clientId: string
  fileName: string
}) {
  return {
    client_id: options.clientId,
    prompt: {
      3: {
        inputs: {
          seed: options.seed,
          steps: options.steps,
          cfg: options.cfgScale,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: options.denoise || 0.5,
          model: [
            '4',
            0
          ],
          positive: [
            '6',
            0
          ],
          negative: [
            '7',
            0
          ],
          latent_image: [
            '10',
            0
          ]
        },
        class_type: 'KSampler'
      },
      4: {
        inputs: { ckpt_name: options.model },
        class_type: 'CheckpointLoaderSimple'
      },
      6: {
        inputs: {
          text: options.prompt,
          clip: [
            '4',
            1
          ]
        },
        class_type: 'CLIPTextEncode'
      },
      7: {
        inputs: {
          text: options.negativePrompt,
          clip: [
            '4',
            1
          ]
        },
        class_type: 'CLIPTextEncode'
      },
      8: {
        inputs: {
          samples: [
            '3',
            0
          ],
          vae: [
            '4',
            2
          ]
        },
        class_type: 'VAEDecode'
      },
      9: {
        inputs: {
          filename_prefix: 'ComfyUI',
          images: [
            '8',
            0
          ]
        },
        class_type: 'SaveImage'
      },
      10: {
        inputs: {
          pixels: [
            '11',
            0
          ],
          vae: [
            '4',
            2
          ]
        },
        class_type: 'VAEEncode'
      },
      11: {
        inputs: {
          image: options.fileName,
          'choose file to upload': 'image'
        },
        class_type: 'LoadImage'
      }
    }
  }
}
