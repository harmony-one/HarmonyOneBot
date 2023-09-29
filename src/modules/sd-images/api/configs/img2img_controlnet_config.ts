import { type Img2ImgOptions } from './img2img_config'

export function buildImg2ImgControlnetPrompt (options: Img2ImgOptions & {
  clientId: string
  fileName: string
}): unknown {
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
          denoise: options.denoise ?? 0.87,
          model: [
            '4',
            0
          ],
          positive: [
            '11',
            0
          ],
          negative: [
            '7',
            0
          ],
          latent_image: [
            '5',
            0
          ]
        },
        class_type: 'KSampler'
      },
      4: {
        inputs: { ckpt_name: options.model },
        class_type: 'CheckpointLoaderSimple'
      },
      5: {
        inputs: {
          width: options.width,
          height: options.height,
          batch_size: 1
        },
        class_type: 'EmptyLatentImage'
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
          image: options.fileName,
          'choose file to upload': 'image'
        },
        class_type: 'LoadImage'
      },
      11: {
        inputs: {
          strength: 1,
          conditioning: [
            '6',
            0
          ],
          control_net: [
            '12',
            0
          ],
          image: [
            '10',
            0
          ]
        },
        class_type: 'ControlNetApply'
      },
      12: {
        inputs: {
          // "control_net_name": "controlnet11Models_tileE.safetensors"
          control_net_name: 'control_v11f1e_sd15_tile.pth'
        },
        class_type: 'ControlNetLoader'
      }
    }
  }
}
