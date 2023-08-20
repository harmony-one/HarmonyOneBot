import { ComfyClient } from '../qrcode/comfy/ComfyClient';
import config from "../../config";
import { sleep, waitingExecute } from './utils';
import { buildImgPrompt } from './text_to_img_config';
import { type } from 'os';

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
    model?: string;
}

export type Txt2ImgResponse = {
    images: Buffer[]
    parameters: object
    all_seeds: string[]
    info: string
}

export type MODEL_TYPE =
    "deliberate_v2" |
    "dreamshaper_8" |
    "majicmixRealistic_betterV2V25" |
    "revAnimated_v122" |
    "v1-5-pruned-emaonly";

// export enum MODELS {
//     // "XL_BASE_1.0" = "sd_xl_base_1.0.safetensors",
// }

export const MODELS_CONFIG: Record<MODEL_TYPE, { path: string, name: string, id: string }> = {
    "deliberate_v2": {
        path: "deliberate_v2.safetensors",
        name: "deliberate_v2",
        id: 'm1',
    },
    "dreamshaper_8": {
        path: "dreamshaper_8.safetensors",
        name: "dreamshaper_8",
        id: 'm2',
    },
    "majicmixRealistic_betterV2V25": {
        path: "majicmixRealistic_betterV2V25.safetensors",
        name: "majicmixRealistic_betterV2V25",
        id: 'm3',
    },
    "revAnimated_v122": {
        path: "revAnimated_v122.safetensors",
        name: "revAnimated_v122",
        id: 'm4',
    },
    "v1-5-pruned-emaonly": {
        path: "v1-5-pruned-emaonly.safetensors",
        name: "v1-5-pruned-emaonly",
        id: 'm5',
    },
}

export const MODELS_CONFIGS = [
    {
        path: "deliberate_v2.safetensors",
        name: "deliberate_v2",
        id: 'm1',
    },
    {
        path: "dreamshaper_8.safetensors",
        name: "dreamshaper_8",
        id: 'm2',
    },
    {
        path: "majicmixRealistic_betterV2V25.safetensors",
        name: "majicmixRealistic_betterV2V25",
        id: 'm3',
    },
    {
        path: "revAnimated_v122.safetensors",
        name: "revAnimated_v122",
        id: 'm4',
    },
    {
        path: "v1-5-pruned-emaonly.safetensors",
        name: "v1-5-pruned-emaonly",
        id: 'm5',
    }]

const getRandomSeed = () => Math.round(Math.random() * 1e15);

export class Client {
    constructor() { }

    txt2img = async (options: Txt2ImgOptions, serverConfig?: { host: string, wsHost: string }): Promise<Txt2ImgResponse> => {
        console.log('txt2img', options);

        const comfyClient = new ComfyClient({
            host: config.comfyHost,
            wsHost: config.comfyWsHost,
            ...serverConfig
        });

        try {
            let attempts = 3;

            while (attempts > 0 && !comfyClient.wsConnection) {
                await sleep(1000);
                attempts--;
            }

            const seed = options.seed || getRandomSeed();

            const prompt = buildImgPrompt({
                seed,
                clientId: comfyClient.clientId,
                model: MODELS_CONFIG.deliberate_v2.path,
                ...options,
            });

            const r = await comfyClient.queuePrompt(prompt);

            const promptResult = await waitingExecute(() => comfyClient.waitingPromptExecution(r.prompt_id), 1000 * 120);

            const history = await comfyClient.history(r.prompt_id);

            const images = await Promise.all(
                history.outputs['9'].images.map(async img => await comfyClient.downloadResult(img.filename))
            );

            comfyClient.abortWebsocket();

            return {
                images,
                parameters: {},
                all_seeds: [String(seed)],
                info: ''
            } as Txt2ImgResponse;
        } catch (e) {
            comfyClient.abortWebsocket();
            throw e;
        }
    }
}