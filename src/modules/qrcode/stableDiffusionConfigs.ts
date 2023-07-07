export interface SDConfig {
  prompt: string,
  negativePrompt?: string,
  imgBase64: string,
  guidanceStart?: number,
  guidanceEnd?: number,
  steps?: number,
  width?: number,
  height?: number,
}


export const getTxt2ImgConfig = (conf: SDConfig) => {
  const {
    imgBase64,
    prompt,
    negativePrompt = '',
    steps = 40,
    guidanceStart = 0.02,
    guidanceEnd = 0.9,
    width = 600,
    height = 600,
  } = conf;

  return {
    "prompt": prompt,
    "negative_prompt": negativePrompt,
    "seed": -1,
    "subseed": -1,
    "subseed_strength": 0,
    "sampler_name": "DPM++ 2M Karras",
    "batch_count": 1,
    "batch_size": 1,
    "n_iter": 1,
    steps: steps,
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
            "module": "none",
            "model": "controlnetQRPatternQR_v10 [c4220211]",
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

export const getImg2ImgConfig = (conf: SDConfig) => {
  const {
    imgBase64,
    prompt,
    negativePrompt = '',
    steps = 60,
    guidanceStart = 0.195,
    guidanceEnd = 0.65,
    width = 600,
    height = 600,
  } = conf;

  return {
    "init_images": [imgBase64],
    "prompt": prompt,
    "negative_prompt": negativePrompt,
    "seed": -1,
    "subseed": -1,
    "subseed_strength": 0,
    "sampler_name": "DPM++ 2M Karras",
    "batch_size": 1,
    "n_iter": 1,
    steps: steps,
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
