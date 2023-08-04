import { ComfyClient } from '../qrcode/comfy/ComfyClient';
import config from "../../config";
import { sleep, waitingExecute } from './utils';

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
    images: Buffer[]
    parameters: object
    all_seeds: string[]
    info: string
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

const getRandomSeed = () => Math.round(Math.random() * 1e15);

function buildQrPrompt(options: Txt2ImgOptions & { clientId: string }) {
    // return { "client_id": options.clientId, "prompt": { "3": { "inputs": { "seed": options.seed, "steps": options.steps, "cfg": 8, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" }, "4": { "inputs": { "ckpt_name": "sd_xl_refiner_0.9.safetensors" }, "class_type": "CheckpointLoaderSimple" }, "5": { "inputs": { "width": 512, "height": 512, "batch_size": options.batchSize || 1 }, "class_type": "EmptyLatentImage" }, "6": { "inputs": { "text": options.prompt, "clip": ["4", 1] }, "class_type": "CLIPTextEncode" }, "7": { "inputs": { "text": options.negativePrompt, "clip": ["4", 1] }, "class_type": "CLIPTextEncode" }, "8": { "inputs": { "samples": ["3", 0], "vae": ["4", 2] }, "class_type": "VAEDecode" }, "9": { "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] }, "class_type": "SaveImage" } }, "extra_data": { "extra_pnginfo": { "workflow": { "last_node_id": 9, "last_link_id": 9, "nodes": [{ "id": 7, "type": "CLIPTextEncode", "pos": [413, 389], "size": { "0": 425.27801513671875, "1": 180.6060791015625 }, "flags": {}, "order": 3, "mode": 0, "inputs": [{ "name": "clip", "type": "CLIP", "link": 5 }], "outputs": [{ "name": "CONDITIONING", "type": "CONDITIONING", "links": [6], "slot_index": 0 }], "properties": { "Node name for S&R": "CLIPTextEncode" }, "widgets_values": [options.negativePrompt] }, { "id": 6, "type": "CLIPTextEncode", "pos": [415, 186], "size": { "0": 422.84503173828125, "1": 164.31304931640625 }, "flags": {}, "order": 2, "mode": 0, "inputs": [{ "name": "clip", "type": "CLIP", "link": 3 }], "outputs": [{ "name": "CONDITIONING", "type": "CONDITIONING", "links": [4], "slot_index": 0 }], "properties": { "Node name for S&R": "CLIPTextEncode" }, "widgets_values": [options.prompt] }, { "id": 5, "type": "EmptyLatentImage", "pos": [473, 609], "size": { "0": 315, "1": 106 }, "flags": {}, "order": 0, "mode": 0, "outputs": [{ "name": "LATENT", "type": "LATENT", "links": [2], "slot_index": 0 }], "properties": { "Node name for S&R": "EmptyLatentImage" }, "widgets_values": [512, 512, 1] }, { "id": 3, "type": "KSampler", "pos": [863, 186], "size": { "0": 315, "1": 262 }, "flags": {}, "order": 4, "mode": 0, "inputs": [{ "name": "model", "type": "MODEL", "link": 1 }, { "name": "positive", "type": "CONDITIONING", "link": 4 }, { "name": "negative", "type": "CONDITIONING", "link": 6 }, { "name": "latent_image", "type": "LATENT", "link": 2 }], "outputs": [{ "name": "LATENT", "type": "LATENT", "links": [7], "slot_index": 0 }], "properties": { "Node name for S&R": "KSampler" }, "widgets_values": [442035228573136, "randomize", 20, 8, "euler", "normal", 1] }, { "id": 8, "type": "VAEDecode", "pos": [1209, 188], "size": { "0": 210, "1": 46 }, "flags": {}, "order": 5, "mode": 0, "inputs": [{ "name": "samples", "type": "LATENT", "link": 7 }, { "name": "vae", "type": "VAE", "link": 8 }], "outputs": [{ "name": "IMAGE", "type": "IMAGE", "links": [9], "slot_index": 0 }], "properties": { "Node name for S&R": "VAEDecode" } }, { "id": 9, "type": "SaveImage", "pos": [1451, 189], "size": { "0": 210, "1": 270 }, "flags": {}, "order": 6, "mode": 0, "inputs": [{ "name": "images", "type": "IMAGE", "link": 9 }], "properties": {}, "widgets_values": ["ComfyUI"] }, { "id": 4, "type": "CheckpointLoaderSimple", "pos": [26, 474], "size": { "0": 315, "1": 98 }, "flags": {}, "order": 1, "mode": 0, "outputs": [{ "name": "MODEL", "type": "MODEL", "links": [1], "slot_index": 0 }, { "name": "CLIP", "type": "CLIP", "links": [3, 5], "slot_index": 1 }, { "name": "VAE", "type": "VAE", "links": [8], "slot_index": 2 }], "properties": { "Node name for S&R": "CheckpointLoaderSimple" }, "widgets_values": ["sd_xl_refiner_0.9.safetensors"] }], "links": [[1, 4, 0, 3, 0, "MODEL"], [2, 5, 0, 3, 3, "LATENT"], [3, 4, 1, 6, 0, "CLIP"], [4, 6, 0, 3, 1, "CONDITIONING"], [5, 4, 1, 7, 0, "CLIP"], [6, 7, 0, 3, 2, "CONDITIONING"], [7, 3, 0, 8, 0, "LATENT"], [8, 4, 2, 8, 1, "VAE"], [9, 8, 0, 9, 0, "IMAGE"]], "groups": [], "config": {}, "extra": {}, "version": 0.4 } } } };
    return {"client_id": options.clientId,"prompt":{"3":{"inputs":{"seed":options.seed,"steps":options.steps,"cfg":8,"sampler_name":"euler_ancestral","scheduler":"karras","denoise":1,"model":["4",0],"positive":["6",0],"negative":["7",0],"latent_image":["5",0]},"class_type":"KSampler"},"4":{"inputs":{"ckpt_name":"sd_xl_base_1.0.safetensors"},"class_type":"CheckpointLoaderSimple"},"5":{"inputs":{"width":1024,"height":1024,"batch_size":options.batchSize || 1},"class_type":"EmptyLatentImage"},"6":{"inputs":{"text":options.prompt,"clip":["4",1]},"class_type":"CLIPTextEncode"},"7":{"inputs":{"text":"","clip":["4",1]},"class_type":"CLIPTextEncode"},"8":{"inputs":{"samples":["3",0],"vae":["4",2]},"class_type":"VAEDecode"},"9":{"inputs":{"filename_prefix":"ComfyUI","images":["8",0]},"class_type":"SaveImage"}},"extra_data":{"extra_pnginfo":{"workflow":{"last_node_id":9,"last_link_id":9,"nodes":[{"id":7,"type":"CLIPTextEncode","pos":[413,389],"size":{"0":425.27801513671875,"1":180.6060791015625},"flags":{},"order":3,"mode":0,"inputs":[{"name":"clip","type":"CLIP","link":5}],"outputs":[{"name":"CONDITIONING","type":"CONDITIONING","links":[6],"slot_index":0}],"properties":{"Node name for S&R":"CLIPTextEncode"},"widgets_values":[""]},{"id":8,"type":"VAEDecode","pos":[1209,188],"size":{"0":210,"1":46},"flags":{},"order":5,"mode":0,"inputs":[{"name":"samples","type":"LATENT","link":7},{"name":"vae","type":"VAE","link":8}],"outputs":[{"name":"IMAGE","type":"IMAGE","links":[9],"slot_index":0}],"properties":{"Node name for S&R":"VAEDecode"}},{"id":4,"type":"CheckpointLoaderSimple","pos":[26,474],"size":{"0":315,"1":98},"flags":{},"order":0,"mode":0,"outputs":[{"name":"MODEL","type":"MODEL","links":[1],"slot_index":0},{"name":"CLIP","type":"CLIP","links":[3,5],"slot_index":1},{"name":"VAE","type":"VAE","links":[8],"slot_index":2}],"properties":{"Node name for S&R":"CheckpointLoaderSimple"},"widgets_values":["sd_xl_base_1.0.safetensors"]},{"id":6,"type":"CLIPTextEncode","pos":[415,186],"size":{"0":422.84503173828125,"1":164.31304931640625},"flags":{},"order":2,"mode":0,"inputs":[{"name":"clip","type":"CLIP","link":3}],"outputs":[{"name":"CONDITIONING","type":"CONDITIONING","links":[4],"slot_index":0}],"properties":{"Node name for S&R":"CLIPTextEncode"},"widgets_values":[options.prompt]},{"id":5,"type":"EmptyLatentImage","pos":[473,609],"size":{"0":315,"1":106},"flags":{},"order":1,"mode":0,"outputs":[{"name":"LATENT","type":"LATENT","links":[2],"slot_index":0}],"properties":{"Node name for S&R":"EmptyLatentImage"},"widgets_values":[1024,1024,1]},{"id":9,"type":"SaveImage","pos":[1451,189],"size":{"0":210,"1":270},"flags":{},"order":6,"mode":0,"inputs":[{"name":"images","type":"IMAGE","link":9}],"properties":{},"widgets_values":["ComfyUI"]},{"id":3,"type":"KSampler","pos":[863,186],"size":{"0":315,"1":262},"flags":{},"order":4,"mode":0,"inputs":[{"name":"model","type":"MODEL","link":1},{"name":"positive","type":"CONDITIONING","link":4},{"name":"negative","type":"CONDITIONING","link":6},{"name":"latent_image","type":"LATENT","link":2}],"outputs":[{"name":"LATENT","type":"LATENT","links":[7],"slot_index":0}],"properties":{"Node name for S&R":"KSampler"},"widgets_values":[877217196051697,"randomize",30,8,"euler_ancestral","karras",1]}],"links":[[1,4,0,3,0,"MODEL"],[2,5,0,3,3,"LATENT"],[3,4,1,6,0,"CLIP"],[4,6,0,3,1,"CONDITIONING"],[5,4,1,7,0,"CLIP"],[6,7,0,3,2,"CONDITIONING"],[7,3,0,8,0,"LATENT"],[8,4,2,8,1,"VAE"],[9,8,0,9,0,"IMAGE"]],"groups":[],"config":{},"extra":{},"version":0.4}}}}
}

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

            const prompt = buildQrPrompt({
                ...options,
                seed,
                clientId: comfyClient.clientId
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