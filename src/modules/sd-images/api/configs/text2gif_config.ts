import { type Txt2ImgOptions } from './types'

export function buildText2GifPrompt(options: Txt2ImgOptions & { clientId: string }): unknown {
  return {
    client_id: options.clientId,
    prompt: {
      "2": {
        "inputs": {
          "vae_name": "vae-ft-mse-840000-ema-pruned.ckpt"
        },
        "class_type": "VAELoader"
      },
      "3": {
        "inputs": {
          "text": options.prompt,
          "clip": [
            "4",
            0
          ]
        },
        "class_type": "CLIPTextEncode"
      },
      "4": {
        "inputs": {
          "stop_at_clip_layer": -2,
          "clip": [
            "32",
            1
          ]
        },
        "class_type": "CLIPSetLastLayer"
      },
      "6": {
        "inputs": {
          "text": options.negativePrompt,
          "clip": [
            "4",
            0
          ]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "seed": options.seed,
          "steps": options.steps || 20,
          "cfg": 8,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": [
            "27",
            0
          ],
          "positive": [
            "3",
            0
          ],
          "negative": [
            "6",
            0
          ],
          "latent_image": [
            "9",
            0
          ]
        },
        "class_type": "KSampler"
      },
      "9": {
        "inputs": {
          "width": options.width,
          "height": options.height,
          "batch_size": options.batchSize || 16
        },
        "class_type": "EmptyLatentImage"
      },
      "10": {
        "inputs": {
          "samples": [
            "7",
            0
          ],
          "vae": [
            "2",
            0
          ]
        },
        "class_type": "VAEDecode"
      },
      "26": {
        "inputs": {
          "frame_rate": 8,
          "loop_count": 0,
          "filename_prefix": "ComfyUI",
          "format": "image/gif",
          "pingpong": false,
          "save_image": true,
          "images": [
            "10",
            0
          ]
        },
        "class_type": "ADE_AnimateDiffCombine"
      },
      "27": {
        "inputs": {
          "model_name": "mm_sd_v14.ckpt",
          "beta_schedule": "sqrt_linear (AnimateDiff)",
          "model": [
            "32",
            0
          ]
        },
        "class_type": "ADE_AnimateDiffLoaderWithContext"
      },
      "32": {
        "inputs": {
          "ckpt_name": options.model
        },
        "class_type": "CheckpointLoaderSimple"
      }
    }
  }
}
