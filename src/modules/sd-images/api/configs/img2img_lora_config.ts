import { type Img2ImgOptions } from './img2img_config'

export function buildImg2ImgLoraPrompt (options: Img2ImgOptions & {
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
          sampler_name: 'dpmpp_2m',
          scheduler: 'karras',
          denoise: options.denoise || 1,
          model: [
            '12',
            0
          ],
          positive: [
            '15',
            0
          ],
          negative: [
            '7',
            0
          ],
          latent_image: [
            '18',
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
            '12',
            1
          ]
        },
        class_type: 'CLIPTextEncode'
      },
      7: {
        inputs: {
          text: options.negativePrompt,
          clip: [
            '12',
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
          image: options.fileName,
          'choose file to upload': 'image'
        },
        class_type: 'LoadImage'
      },
      12: {
        inputs: {
          lora_name: options.loraPath,
          strength_model: 1,
          strength_clip: 2,
          model: [
            '4',
            0
          ],
          clip: [
            '4',
            1
          ]
        },
        class_type: 'LoraLoader'
      },
      13: {
        inputs: { control_net_name: 'qrCodeMonster_v20.safetensors' },
        class_type: 'ControlNetLoader'
      },
      15: {
        inputs: {
          strength: 1,
          conditioning: [
            '6',
            0
          ],
          control_net: [
            '13',
            0
          ],
          image: [
            '10',
            0
          ]
        },
        class_type: 'ControlNetApply'
      },
      18: {
        inputs: {
          width: 512,
          height: 512,
          batch_size: 1
        },
        class_type: 'EmptyLatentImage'
      }
    }
  }
}
