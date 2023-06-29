
export const getTxt2ImgConfig = ({imgBase64, prompt}: {prompt: string, imgBase64: string}) => {
  return {
    "prompt": prompt,
    "negative_prompt": "(KHFB, AuroraNegative),(Worst Quality, Low Quality:1.4), normal quality, lowres, ugly, disfigured, low quality, blurry, fewer fingers, bad hand, strange hand, (worst quality, low quality:1.4), monochrome, zombie, (interlocked fingers)",
    "seed": -1,
    "subseed": -1,
    "subseed_strength": 0,
    "sampler_name": "DPM++ 2M Karras",
    "batch_size": 1,
    "n_iter": 1,
    "steps": 60,
    width: '600',
    height: '600',
    "cfg_scale": 7,
    "seed_resize_from_h": -1,
    "seed_resize_from_w": -1,
    "restore_faces": false,

    "alwayson_scripts": {
      "controlnet": {
        "args": [
          {
            "input_image": imgBase64,
            "module": "none",
            "model": "controlnetQRPatternQR_v10 [c4220211]",
            "weight": 1,
            // "mask": "pixel_perfect",
            "resize_mode": 0,
            "control_mode": 0,
            "guidance_start": 0.08,
            "guidance_end": 0.75,
            "pixel_perfect": true,
          }
        ]
      }
    }
  }
}

export interface Img2ImgConfig {
  prompt: string,
  imgBase64: string,
  guidanceStart?: number,
  guidanceEnd?: number,
  steps?: number,
  width?: number,
  height?: number,
}

export const getImg2ImgConfig = (conf: Img2ImgConfig) => {
  const {
    imgBase64,
    prompt,
    steps = 60,
    guidanceStart = 0.2,
    guidanceEnd = 0.8,
    width = 500,
    height = 500,
  } = conf;

  return {
    "init_images": [imgBase64],
    "prompt": prompt,
    "negative_prompt": "(KHFB, AuroraNegative),(Worst Quality, Low Quality:1.4) worst quality, low quality, normal quality, lowres, ugly, disfigured, low quality, blurry, fewer fingers, bad hand, strange hand, (worst quality, low quality:1.4), monochrome, zombie, (interlocked fingers)",
    "seed": -1,
    "subseed": -1,
    "subseed_strength": 0,
    "sampler_name": "DPM++ 2M Karras",
    "batch_size": 1,
    "n_iter": 1,
    "steps": steps,
    width: width,
    height: height,
    "cfg_scale": 7,
    "seed_resize_from_h": -1,
    "seed_resize_from_w": -1,
    "restore_faces": false,

    "alwayson_scripts": {
      "controlnet": {
        "args": [
          {
            "input_image": imgBase64,
            "module": "tile_resample",
            "model": "control_v11f1e_sd15_tile [a371b31b]",
            "weight": 1,
            // "mask": "pixel_perfect",
            "resize_mode": 0,
            "control_mode": 0,
            "guidance_start": guidanceStart,
            "guidance_end": guidanceEnd,
            "pixel_perfect": true,
          }
        ]
      }
    }
  }
}
