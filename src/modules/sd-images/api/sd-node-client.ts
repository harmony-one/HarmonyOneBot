import { ComfyClient } from '../../qrcode/comfy/ComfyClient';
import config from "../../../config";
import { sleep } from '../utils';
import {
    buildImgPromptLora,
    buildImgPrompt,
    buildImg2ImgPrompt,
    buildImg2ImgControlnetPrompt,
    buildImg2ImgControlnetV2Prompt,
    Txt2ImgOptions,
    Img2ImgOptions
} from './configs';
import { NEGATIVE_PROMPT, waitingExecute } from './helpers';

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

            const buildImgPromptMethod = !!options.loraPath ? buildImgPromptLora : buildImgPrompt;

            const prompt = buildImgPromptMethod({
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

    img2img = async (
        fileBuffer: Buffer,
        options: Img2ImgOptions,
        serverConfig?: { host: string, wsHost: string }
    ): Promise<Txt2ImgResponse> => {
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

            const filename = Date.now() + '.png';

            const uploadResult = await comfyClient.uploadImage({ filename, fileBuffer, override: true });

            let prompt;

            switch (options.controlnetVersion) {
                case 1:
                    prompt = buildImg2ImgPrompt({
                        ...options,
                        seed,
                        clientId: comfyClient.clientId,
                        fileName: uploadResult.name,
                    });
                    break;

                case 2:
                    prompt = buildImg2ImgControlnetPrompt({
                        ...options,
                        seed,
                        clientId: comfyClient.clientId,
                        fileName: uploadResult.name,
                    });
                    break;

                case 3:
                    prompt = buildImg2ImgControlnetV2Prompt({
                        ...options,
                        seed,
                        clientId: comfyClient.clientId,
                        fileName: uploadResult.name,
                        cfgScale: 7
                    });
                    break;
            }

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