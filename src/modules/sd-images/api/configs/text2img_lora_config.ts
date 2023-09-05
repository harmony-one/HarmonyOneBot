import { Txt2ImgOptions } from './types';

export function buildImgPromptLora(options: Txt2ImgOptions & { clientId: string }) {
    return {
        client_id: options.clientId,
        "prompt": {
            "3": {
                "inputs": {
                    "seed": options.seed,
                    "steps": options.steps,
                    "cfg": options.cfgScale,
                    "sampler_name": "dpmpp_2m",
                    "scheduler": "karras",
                    "denoise": 1,
                    "model": [
                        "10",
                        0
                    ],
                    "positive": [
                        "6",
                        0
                    ],
                    "negative": [
                        "7",
                        0
                    ],
                    "latent_image": [
                        "5",
                        0
                    ]
                },
                "class_type": "KSampler"
            },
            "4": {
                "inputs": {
                    "ckpt_name": options.model
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "5": {
                "inputs": {
                    "width": options.width,
                    "height": options.height,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "6": {
                "inputs": {
                    "text": options.prompt,
                    "clip": [
                        "10",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": options.negativePrompt,
                    "clip": [
                        "10",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": [
                        "3",
                        0
                    ],
                    "vae": [
                        "4",
                        2
                    ]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": [
                        "8",
                        0
                    ]
                },
                "class_type": "SaveImage"
            },
            "10": {
                "inputs": {
                    "lora_name": options.loraPath,
                    "strength_model": options.loraStrength || 1,
                    "strength_clip": options.loraStrength || 1,
                    "model": [
                        "4",
                        0
                    ],
                    "clip": [
                        "4",
                        1
                    ]
                },
                "class_type": "LoraLoader"
            }
        }
    }
}