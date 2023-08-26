import { ComfyClient } from '../../qrcode/comfy/ComfyClient';
import config from "../../../config";
import { sleep } from '../utils';
import { buildImgPrompt } from './text_to_img_config';
import { buildImgPromptLora } from './text_to_img_lora_config';
import { MODELS_CONFIGS } from './models-config';
import { waitingExecute } from './helpers';

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

const getRandomSeed = () => Math.round(Math.random() * 1e15);

export class Client {
    constructor() { }

    txt2img = async (options: Txt2ImgOptions, serverConfig?: { host: string, wsHost: string }): Promise<Txt2ImgResponse> => {
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

            const prompt = buildImgPromptLora({
                ...options,
                seed,
                clientId: comfyClient.clientId,
            });

            const r = await comfyClient.queuePrompt(prompt);

            const promptResult = await waitingExecute(() => comfyClient.waitingPromptExecution(r.prompt_id), 1000 * 180);

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