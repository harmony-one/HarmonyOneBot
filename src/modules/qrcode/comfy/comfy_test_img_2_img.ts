import { ComfyClient } from './ComfyClient'
import crypto from 'crypto'
import { createQRCode } from '../utils'
import * as fs from 'fs'
import config from '../../../config'

function isDirectoryExists (path: string): boolean {
  try {
    const stats = fs.statSync(path)
    return stats.isDirectory()
  } catch (error) {
    // @ts-expect-error TS18046: 'error' is of type 'unknown'.
    if (error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}

async function buildQrPrompt (d: { qrFilename: string, clientId: string }): Promise<unknown> {
  return {
    client_id: d.clientId,
    prompt: {
      3: {
        inputs: {
          seed: 105025667599296,
          steps: 40,
          cfg: 7,
          sampler_name: 'dpmpp_2m_sde',
          scheduler: 'karras',
          denoise: 1,
          model: ['14', 0],
          positive: ['10', 0],
          negative: ['7', 0],
          latent_image: ['16', 0]
        },
        class_type: 'KSampler'
      },
      6: { inputs: { text: ' rocket ship shooting up, 111', clip: ['14', 1] }, class_type: 'CLIPTextEncode' },
      7: {
        inputs: {
          text: '(hands), text, error, cropped, (worst quality:1.2), (low quality:1.2), normal quality, (jpeg artifacts:1.3), signature, watermark, username, blurry, artist name, monochrome, sketch, censorship, censor, (copyright:1.2), extra legs, (forehead mark) (depth of field) (emotionless) (penis)',
          clip: ['14', 1]
        },
        class_type: 'CLIPTextEncode'
      },
      8: { inputs: { samples: ['3', 0], vae: ['14', 2] }, class_type: 'VAEDecode' },
      9: { inputs: { filename_prefix: 'ComfyUI', images: ['8', 0] }, class_type: 'SaveImage' },
      10: {
        inputs: { strength: 0.425, conditioning: ['6', 0], control_net: ['12', 0], image: ['11', 0] },
        class_type: 'ControlNetApply'
      },
      11: {
        inputs: { image: d.qrFilename, 'choose file to upload': 'image' },
        class_type: 'LoadImage'
      },
      12: { inputs: { control_net_name: 'control_v11f1e_sd15_tile.pth' }, class_type: 'ControlNetLoader' },
      14: { inputs: { ckpt_name: 'deliberate_v2.safetensors' }, class_type: 'CheckpointLoaderSimple' },
      16: { inputs: { pixels: ['11', 0], vae: ['14', 2] }, class_type: 'VAEEncode' },
      19: { inputs: { filename_prefix: 'ComfyUI' }, class_type: 'SaveImage' }
    },
    extra_data: {
      extra_pnginfo: {
        workflow: {
          last_node_id: 19,
          last_link_id: 28,
          nodes: [{
            id: 6,
            type: 'CLIPTextEncode',
            pos: [-42, -147],
            size: { 0: 422.84503173828125, 1: 164.31304931640625 },
            flags: {},
            order: 5,
            mode: 0,
            inputs: [{ name: 'clip', type: 'CLIP', link: 21 }],
            outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [10], slot_index: 0 }],
            properties: { 'Node name for S&R': 'CLIPTextEncode' },
            widgets_values: [' rocket ship shooting up, 111']
          }, {
            id: 12,
            type: 'ControlNetLoader',
            pos: [-50, 69],
            size: { 0: 422, 1: 58 },
            flags: {},
            order: 0,
            mode: 0,
            outputs: [{ name: 'CONTROL_NET', type: 'CONTROL_NET', links: [13], slot_index: 0 }],
            properties: { 'Node name for S&R': 'ControlNetLoader' },
            widgets_values: ['control_v11f1e_sd15_tile.pth']
          }, {
            id: 8,
            type: 'VAEDecode',
            pos: [1343, 114],
            size: { 0: 210, 1: 46 },
            flags: {},
            order: 9,
            mode: 0,
            inputs: [{ name: 'samples', type: 'LATENT', link: 7 }, { name: 'vae', type: 'VAE', link: 22 }],
            outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [9], slot_index: 0 }],
            properties: { 'Node name for S&R': 'VAEDecode' }
          }, {
            id: 3,
            type: 'KSampler',
            pos: [943, 110],
            size: { 0: 315, 1: 262 },
            flags: { collapsed: false },
            order: 8,
            mode: 0,
            inputs: [{ name: 'model', type: 'MODEL', link: 19 }, {
              name: 'positive',
              type: 'CONDITIONING',
              link: 18
            }, { name: 'negative', type: 'CONDITIONING', link: 16 }, {
              name: 'latent_image',
              type: 'LATENT',
              link: 24
            }],
            outputs: [{ name: 'LATENT', type: 'LATENT', links: [7], slot_index: 0 }],
            properties: { 'Node name for S&R': 'KSampler' },
            widgets_values: [105025667599296, 'fixed', 40, 7, 'dpmpp_2m_sde', 'karras', 1]
          }, {
            id: 7,
            type: 'CLIPTextEncode',
            pos: [431, 190],
            size: { 0: 425.27801513671875, 1: 180.6060791015625 },
            flags: {},
            order: 4,
            mode: 0,
            inputs: [{ name: 'clip', type: 'CLIP', link: 20 }],
            outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [16], slot_index: 0 }],
            properties: { 'Node name for S&R': 'CLIPTextEncode' },
            widgets_values: ['(hands), text, error, cropped, (worst quality:1.2), (low quality:1.2), normal quality, (jpeg artifacts:1.3), signature, watermark, username, blurry, artist name, monochrome, sketch, censorship, censor, (copyright:1.2), extra legs, (forehead mark) (depth of field) (emotionless) (penis)']
          }, {
            id: 10,
            type: 'ControlNetApply',
            pos: [508, -7],
            size: { 0: 317.4000244140625, 1: 98 },
            flags: {},
            order: 7,
            mode: 0,
            inputs: [{ name: 'conditioning', type: 'CONDITIONING', link: 10 }, {
              name: 'control_net',
              type: 'CONTROL_NET',
              link: 13
            }, { name: 'image', type: 'IMAGE', link: 12 }],
            outputs: [{ name: 'CONDITIONING', type: 'CONDITIONING', links: [18], slot_index: 0 }],
            properties: { 'Node name for S&R': 'ControlNetApply' },
            widgets_values: [0.425]
          }, {
            id: 16,
            type: 'VAEEncode',
            pos: [552, 468],
            size: { 0: 210, 1: 46 },
            flags: {},
            order: 6,
            mode: 0,
            inputs: [{ name: 'pixels', type: 'IMAGE', link: 28 }, { name: 'vae', type: 'VAE', link: 25 }],
            outputs: [{ name: 'LATENT', type: 'LATENT', links: [24], shape: 3, slot_index: 0 }],
            properties: { 'Node name for S&R': 'VAEEncode' }
          }, {
            id: 14,
            type: 'CheckpointLoaderSimple',
            pos: [-640, 110],
            size: { 0: 315, 1: 98 },
            flags: {},
            order: 1,
            mode: 0,
            outputs: [{ name: 'MODEL', type: 'MODEL', links: [19], slot_index: 0 }, {
              name: 'CLIP',
              type: 'CLIP',
              links: [20, 21],
              slot_index: 1
            }, { name: 'VAE', type: 'VAE', links: [22, 25], slot_index: 2 }],
            properties: { 'Node name for S&R': 'CheckpointLoaderSimple' },
            widgets_values: ['deliberate_v2.safetensors']
          }, {
            id: 19,
            type: 'SaveImage',
            pos: [1696, -45],
            size: { 0: 315, 1: 58 },
            flags: { collapsed: true },
            order: 2,
            mode: 0,
            inputs: [{ name: 'images', type: 'IMAGE', link: null }],
            properties: {},
            widgets_values: ['ComfyUI']
          }, {
            id: 9,
            type: 'SaveImage',
            pos: [1635, 113],
            size: { 0: 393.6202087402344, 1: 449.1610107421875 },
            flags: {},
            order: 10,
            mode: 0,
            inputs: [{ name: 'images', type: 'IMAGE', link: 9 }],
            properties: {},
            widgets_values: ['ComfyUI']
          }, {
            id: 11,
            type: 'LoadImage',
            pos: [-70, 177],
            size: { 0: 387.97003173828125, 1: 465.5097961425781 },
            flags: {},
            order: 3,
            mode: 0,
            outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [12, 28], slot_index: 0 }, {
              name: 'MASK',
              type: 'MASK',
              links: null
            }],
            properties: { 'Node name for S&R': 'LoadImage' },
            widgets_values: [d.qrFilename, 'image']
          }],
          links: [[7, 3, 0, 8, 0, 'LATENT'], [9, 8, 0, 9, 0, 'IMAGE'], [10, 6, 0, 10, 0, 'CONDITIONING'], [12, 11, 0, 10, 2, 'IMAGE'], [13, 12, 0, 10, 1, 'CONTROL_NET'], [16, 7, 0, 3, 2, 'CONDITIONING'], [18, 10, 0, 3, 1, 'CONDITIONING'], [19, 14, 0, 3, 0, 'MODEL'], [20, 14, 1, 7, 0, 'CLIP'], [21, 14, 1, 6, 0, 'CLIP'], [22, 14, 2, 8, 1, 'VAE'], [24, 16, 0, 3, 3, 'LATENT'], [25, 14, 2, 16, 1, 'VAE'], [28, 11, 0, 16, 0, 'IMAGE']],
          groups: [],
          config: {},
          extra: {},
          version: 0.4
        }
      }
    }
  }
}

async function main (): Promise<void> {
  const url = 'https://h.country'
  const qrImgBuffer = await createQRCode({ url, margin: 3 })

  console.log('### qrImgBuffer', qrImgBuffer)

  const comfyClient = new ComfyClient({ host: config.comfyHost, wsHost: config.comfyWsHost })
  const filenameHash = crypto.createHash('sha256').update(url, 'utf8')
  const fileName = filenameHash.digest('hex') + '.png'
  console.log('### fileName', fileName)

  const uploadResult = await comfyClient.uploadImage(fileName, qrImgBuffer)
  console.log('### uploadResult', uploadResult)

  const prompt = buildQrPrompt({ qrFilename: uploadResult.name, clientId: comfyClient.clientId })

  try {
    const r = await comfyClient.queuePrompt(prompt)
    console.log('### r.promptId', r.prompt_id)

    const promptResult = await comfyClient.waitingPromptExecution(r.prompt_id)

    console.log('### promptResult', promptResult)

    const history = await comfyClient.history(r.prompt_id)

    console.log('### promptResult.data.output.images[0].filename', promptResult.data.output.images[0].filename)

    const result = await comfyClient.downloadResult(promptResult.data.output.images[0].filename)

    const filePath = 'images/' + promptResult.data.output.images[0].filename

    if (!isDirectoryExists('images')) {
      fs.mkdirSync('images')
      console.log('### create dir images')
    }
    fs.writeFileSync(filePath, result)

    console.log('### history', history)
  } catch (ex) {
    console.log('### ex', ex)
  }
}

main().catch((error) => {
  console.error(error)
})
