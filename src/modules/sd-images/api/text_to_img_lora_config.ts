import { Txt2ImgOptions } from './sd-node-client';

export function buildImgPromptLora(options: Txt2ImgOptions & { clientId: string }) {
    return {
        client_id: options.clientId,
        "prompt": {
            "3": {
                "inputs": {
                    seed: options.seed,
                    steps: options.steps,
                    cfg: options.cfgScale,
                    sampler_name: "dpmpp_2m",
                    scheduler: "karras",
                    "denoise": 1,
                    "model": ["10", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler"
            },
            "4": {
                inputs: { ckpt_name: options.model || "sd_xl_base_1.0.safetensors" },
                "class_type": "CheckpointLoaderSimple"
            },
            5: {
                inputs: {
                    width: options.width || 1024,
                    height: options.height || 1024,
                    batch_size: options.batchSize || 1,
                },
                class_type: "EmptyLatentImage",
            },
            6: {
                inputs: { text: options.prompt, clip: ["4", 1] },
                class_type: "CLIPTextEncode",
            },
            7: { inputs: { text: options.negativePrompt, clip: ["4", 1] }, class_type: "CLIPTextEncode" },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            },
            "10": {
                "inputs": {
                    "lora_name": "add_detail.safetensors",
                    "strength_model": 1,
                    "strength_clip": 1,
                    "model": ["4", 0],
                    "clip": ["4", 1]
                },
                "class_type": "LoraLoader"
            }
        },
        "extra_data": {
            "extra_pnginfo": {
                "workflow": {
                    "last_node_id": 10,
                    "last_link_id": 15,
                    "nodes": [
                        {
                            "id": 5,
                            "type": "EmptyLatentImage",
                            "pos": [
                                473,
                                609
                            ],
                            "size": {
                                "0": 315,
                                "1": 106
                            },
                            "flags": {
                                
                            },
                            "order": 0,
                            "mode": 0,
                            "outputs": [
                                {
                                    "name": "LATENT",
                                    "type": "LATENT",
                                    "links": [
                                        2
                                    ],
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "EmptyLatentImage"
                            },
                            "widgets_values": [
                                options.width,
                                options.height,
                                1
                            ]
                        },
                        {
                            "id": 8,
                            "type": "VAEDecode",
                            "pos": [
                                1209,
                                188
                            ],
                            "size": {
                                "0": 210,
                                "1": 46
                            },
                            "flags": {
                                
                            },
                            "order": 6,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "samples",
                                    "type": "LATENT",
                                    "link": 7
                                },
                                {
                                    "name": "vae",
                                    "type": "VAE",
                                    "link": 8
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "IMAGE",
                                    "type": "IMAGE",
                                    "links": [
                                        9
                                    ],
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "VAEDecode"
                            }
                        },
                        {
                            "id": 9,
                            "type": "SaveImage",
                            "pos": [
                                1451,
                                189
                            ],
                            "size": {
                                "0": 210,
                                "1": 270
                            },
                            "flags": {
                                
                            },
                            "order": 7,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "images",
                                    "type": "IMAGE",
                                    "link": 9
                                }
                            ],
                            "properties": {
                                
                            },
                            "widgets_values": [
                                "ComfyUI"
                            ]
                        },
                        {
                            "id": 6,
                            "type": "CLIPTextEncode",
                            "pos": [
                                283,
                                -87
                            ],
                            "size": {
                                "0": 422.84503173828125,
                                "1": 164.31304931640625
                            },
                            "flags": {
                                
                            },
                            "order": 3,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "clip",
                                    "type": "CLIP",
                                    "link": 14
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "CONDITIONING",
                                    "type": "CONDITIONING",
                                    "links": [
                                        4
                                    ],
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "CLIPTextEncode"
                            },
                            "widgets_values": [
                                options.prompt
                            ]
                        },
                        {
                            "id": 3,
                            "type": "KSampler",
                            "pos": [
                                863,
                                186
                            ],
                            "size": {
                                "0": 315,
                                "1": 474
                            },
                            "flags": {
                                
                            },
                            "order": 5,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "model",
                                    "type": "MODEL",
                                    "link": 13
                                },
                                {
                                    "name": "positive",
                                    "type": "CONDITIONING",
                                    "link": 4
                                },
                                {
                                    "name": "negative",
                                    "type": "CONDITIONING",
                                    "link": 6
                                },
                                {
                                    "name": "latent_image",
                                    "type": "LATENT",
                                    "link": 2
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "LATENT",
                                    "type": "LATENT",
                                    "links": [
                                        7
                                    ],
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "KSampler"
                            },
                            "widgets_values": [
                                options.seed,
                                "randomize",
                                options.steps,
                                8,
                                "dpmpp_2m",
                                "karras",
                                1,
                            ]
                        },
                        {
                            "id": 7,
                            "type": "CLIPTextEncode",
                            "pos": [
                                297,
                                160
                            ],
                            "size": {
                                "0": 425.27801513671875,
                                "1": 180.6060791015625
                            },
                            "flags": {
                                
                            },
                            "order": 4,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "clip",
                                    "type": "CLIP",
                                    "link": 15
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "CONDITIONING",
                                    "type": "CONDITIONING",
                                    "links": [
                                        6
                                    ],
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "CLIPTextEncode"
                            },
                            "widgets_values": [
                                options.negativePrompt
                            ]
                        },
                        {
                            "id": 10,
                            "type": "LoraLoader",
                            "pos": [
                                -178,
                                159
                            ],
                            "size": {
                                "0": 315,
                                "1": 126
                            },
                            "flags": {
                                
                            },
                            "order": 2,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "model",
                                    "type": "MODEL",
                                    "link": 12
                                },
                                {
                                    "name": "clip",
                                    "type": "CLIP",
                                    "link": 11
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "MODEL",
                                    "type": "MODEL",
                                    "links": [
                                        13
                                    ],
                                    "shape": 3,
                                    "slot_index": 0
                                },
                                {
                                    "name": "CLIP",
                                    "type": "CLIP",
                                    "links": [
                                        14,
                                        15
                                    ],
                                    "shape": 3,
                                    "slot_index": 1
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "LoraLoader"
                            },
                            "widgets_values": [
                                "add_detail.safetensors",
                                1,
                                1
                            ]
                        },
                        {
                            "id": 4,
                            "type": "CheckpointLoaderSimple",
                            "pos": [
                                -671,
                                541
                            ],
                            "size": {
                                "0": 315,
                                "1": 98
                            },
                            "flags": {
                                
                            },
                            "order": 1,
                            "mode": 0,
                            "outputs": [
                                {
                                    "name": "MODEL",
                                    "type": "MODEL",
                                    "links": [
                                        12
                                    ],
                                    "slot_index": 0
                                },
                                {
                                    "name": "CLIP",
                                    "type": "CLIP",
                                    "links": [
                                        11
                                    ],
                                    "slot_index": 1
                                },
                                {
                                    "name": "VAE",
                                    "type": "VAE",
                                    "links": [
                                        8
                                    ],
                                    "slot_index": 2
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "CheckpointLoaderSimple"
                            },
                            widgets_values: [options.model || "sd_xl_base_1.0.safetensors"],
                        }
                    ],
                    "links": [
                        [
                            2,
                            5,
                            0,
                            3,
                            3,
                            "LATENT"
                        ],
                        [
                            4,
                            6,
                            0,
                            3,
                            1,
                            "CONDITIONING"
                        ],
                        [
                            6,
                            7,
                            0,
                            3,
                            2,
                            "CONDITIONING"
                        ],
                        [
                            7,
                            3,
                            0,
                            8,
                            0,
                            "LATENT"
                        ],
                        [
                            8,
                            4,
                            2,
                            8,
                            1,
                            "VAE"
                        ],
                        [
                            9,
                            8,
                            0,
                            9,
                            0,
                            "IMAGE"
                        ],
                        [
                            11,
                            4,
                            1,
                            10,
                            1,
                            "CLIP"
                        ],
                        [
                            12,
                            4,
                            0,
                            10,
                            0,
                            "MODEL"
                        ],
                        [
                            13,
                            10,
                            0,
                            3,
                            0,
                            "MODEL"
                        ],
                        [
                            14,
                            10,
                            1,
                            6,
                            0,
                            "CLIP"
                        ],
                        [
                            15,
                            10,
                            1,
                            7,
                            0,
                            "CLIP"
                        ]
                    ],
                    "groups": [
                        
                    ],
                    "config": {
                        
                    },
                    "extra": {
                        
                    },
                    "version": 0.4
                }
            }
        }
    }
}
