import { ComfyClient } from '../qrcode/comfy/ComfyClient';
import config from "../../config";
import { sleep, waitingExecute } from './utils';
import { buildImgPrompt } from './text_to_img_config';

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
    model?: MODELS
}

export type Txt2ImgResponse = {
    images: Buffer[]
    parameters: object
    all_seeds: string[]
    info: string
}

export enum MODELS {
    "XL_BASE_1.0" = "sd_xl_base_1.0.safetensors",
}

const getRandomSeed = () => Math.round(Math.random() * 1e15);

export class Client {
    constructor() { }

    txt2img = async (options: Txt2ImgOptions): Promise<Txt2ImgResponse> => {
        const comfyClient = new ComfyClient({
            host: config.comfyHost,
            wsHost: config.comfyWsHost
        });

        try {
            let attempts = 3;

            while (attempts > 0 && !comfyClient.wsConnection) {
                await sleep(1000);
                attempts--;
            }

            const seed = options.seed || getRandomSeed();

            const prompt = buildImgPrompt({
                ...options,
                seed,
                clientId: comfyClient.clientId,
                model: MODELS['XL_BASE_1.0']
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
                all_seeds: history.outputs['9'].images.map((i, idx) => String(seed + idx)),
                info: ''
            } as Txt2ImgResponse;
        } catch (e) {
            comfyClient.abortWebsocket();
            throw e;
        }
    }
}