import axios from "axios"

export type Txt2ImgOptions = {
    hires?: {
        steps: number
        denoisingStrength: number
        upscaler: string
        upscaleBy?: number
        resizeWidthTo?: number
        resizeHeigthTo?: number
    }
    prompt: string
    negativePrompt?: string
    width?: number
    height?: number
    samplingMethod?: string
    seed?: number
    variationSeed?: number
    variationSeedStrength?: number
    resizeSeedFromHeight?: number
    resizeSeedFromWidth?: number
    batchSize?: number
    batchCount?: number
    steps?: number
    cfgScale?: number
    restoreFaces?: boolean
    script?: {
        name: string
        args?: string[]
    }
}

export type Txt2ImgResponse = {
    images: string[]
    parameters: object
    info: string
}

const mapTxt2ImgOptions = (options: Txt2ImgOptions) => {
    let body: any = {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt,
        seed: options.seed,
        subseed: options.variationSeed,
        subseed_strength: options.variationSeedStrength,
        sampler_name: options.samplingMethod,
        batch_size: options.batchSize,
        n_iter: options.batchCount,
        steps: options.steps,
        width: options.width,
        height: options.height,
        cfg_scale: options.cfgScale,
        seed_resize_from_w: options.resizeSeedFromWidth,
        seed_resize_from_h: options.resizeSeedFromHeight,
        restore_faces: options.restoreFaces,
    }

    if (options.hires) {
        body = {
            ...body,
            enable_hr: true,
            denoising_strength: options.hires.denoisingStrength,
            hr_upscaler: options.hires.upscaler,
            hr_scale: options.hires.upscaleBy,
            hr_resize_x: options.hires.resizeWidthTo,
            hr_resize_y: options.hires.resizeHeigthTo,
            hr_second_pass_steps: options.hires.steps,
        }
    }

    if (options.script) {
        body = {
            ...body,
            script_name: options.script.name,
            script_args: options.script.args || [],
        }
    }

    return body
}

export const SamplingMethod = {
    Euler_A: "Euler a",
    Euler: "Euler",
    LMS: "LMS",
    Heun: "Heun",
    DPM2: "DPM2",
    DPM2_A: "DPM2 a",
    DPMPlusPlus_S2_A: "DPM++ S2 a",
    DPMPlusPlus_2M: "DPM++ 2M",
    DPMPlusPlus_SDE: "DPM++ SDE",
    DPM_Fast: "DPM fast",
    DPM_Adaptive: "DPM adaptive",
    LMS_Karras: "LMS Karras",
    DPM2_Karras: "DPM2 Karras",
    DPM2_A_Karras: "DPM2 a Karras",
    DPMPlusPlus_2S_A_Karras: "DPM++ 2S a Karras",
    DPMPlusPlus_2M_Karras: "DPM++ 2M Karras",
    DPMPlusPlus_SDE_Karras: "DPM++ SDE Karras",
    DDIM: "DDIM",
    PLMS: "PLMS"
}


export class Client {
    apiUrl: string;

    constructor({ apiUrl }: { apiUrl: string }) {
        this.apiUrl = apiUrl;
    }

    txt2img = async (options: Txt2ImgOptions): Promise<Txt2ImgResponse> => {
        const body = mapTxt2ImgOptions(options)

        const endpoint = '/sdapi/v1/txt2img';

        const response = await axios.post(`${this.apiUrl}${endpoint}`, body)

        const data: any = await response.data;

        if (!data?.images) {
            throw new Error('api returned an invalid response')
        }

        return data as Txt2ImgResponse
    }
}