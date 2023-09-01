import { Img2ImgOptions } from './img2img_config';

export function buildImg2ImgControlnetV2Prompt(options: Img2ImgOptions & {
    clientId: string;
    fileName: string;
}) {
    return {
        "client_id": options.clientId,
        "prompt": {
            "6": {
                "inputs": {
                    "text": options.prompt,
                    "clip": [
                        "14",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": options.negativePrompt,
                    "clip": [
                        "14",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": [
                        "23",
                        0
                    ],
                    "vae": [
                        "14",
                        2
                    ]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "QRCode",
                    "images": [
                        "8",
                        0
                    ]
                },
                "class_type": "SaveImage"
            },
            "10": {
                "inputs": {
                    "strength": 1.3,
                    "conditioning": [
                        "6",
                        0
                    ],
                    "control_net": [
                        "12",
                        0
                    ],
                    "image": [
                        "33",
                        0
                    ]
                },
                "class_type": "ControlNetApply"
            },
            "11": {
                "inputs": {
                    "image": options.fileName,
                    "choose file to upload": "image"
                },
                "class_type": "LoadImage"
            },
            "12": {
                "inputs": {
                    "control_net_name": "qrCodeMonster_v20.safetensors"
                },
                "class_type": "ControlNetLoader"
            },
            "14": {
                "inputs": {
                    "ckpt_name": options.model
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "23": {
                "inputs": {
                    "add_noise": "enable",
                    "noise_seed": options.seed,
                    "steps": 100,
                    "cfg": options.cfgScale,
                    "sampler_name": "dpmpp_2m",
                    "scheduler": "karras",
                    "start_at_step": 15,
                    "end_at_step": 70,
                    "return_with_leftover_noise": "disable",
                    "model": [
                        "14",
                        0
                    ],
                    "positive": [
                        "10",
                        0
                    ],
                    "negative": [
                        "7",
                        0
                    ],
                    "latent_image": [
                        "35",
                        0
                    ]
                },
                "class_type": "KSamplerAdvanced"
            },
            "33": {
                "inputs": {
                    "image": [
                        "11",
                        0
                    ]
                },
                "class_type": "ImageInvert"
            },
            "35": {
                "inputs": {
                    "width": 680,
                    "height": 680,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            }
        },
        "extra_data": {
            "extra_pnginfo": {
                "workflow": {
                    "last_node_id": 38,
                    "last_link_id": 58,
                    "nodes": [
                        {
                            "id": 6,
                            "type": "CLIPTextEncode",
                            "pos": [
                                -78,
                                -158
                            ],
                            "size": {
                                "0": 422.84503173828125,
                                "1": 164.31304931640625
                            },
                            "flags": {},
                            "order": 5,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "clip",
                                    "type": "CLIP",
                                    "link": 46
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "CONDITIONING",
                                    "type": "CONDITIONING",
                                    "links": [
                                        47
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
                            "id": 7,
                            "type": "CLIPTextEncode",
                            "pos": [
                                441,
                                175
                            ],
                            "size": {
                                "0": 385.8155212402344,
                                "1": 216.61624145507812
                            },
                            "flags": {},
                            "order": 4,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "clip",
                                    "type": "CLIP",
                                    "link": 20
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "CONDITIONING",
                                    "type": "CONDITIONING",
                                    "links": [
                                        32
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
                            "id": 12,
                            "type": "ControlNetLoader",
                            "pos": [
                                -165,
                                56
                            ],
                            "size": {
                                "0": 422,
                                "1": 58
                            },
                            "flags": {},
                            "order": 0,
                            "mode": 0,
                            "outputs": [
                                {
                                    "name": "CONTROL_NET",
                                    "type": "CONTROL_NET",
                                    "links": [
                                        13
                                    ],
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "ControlNetLoader"
                            },
                            "widgets_values": [
                                "qrCodeMonster_v20.safetensors"
                            ]
                        },
                        {
                            "id": 33,
                            "type": "ImageInvert",
                            "pos": [
                                100,
                                270
                            ],
                            "size": {
                                "0": 210,
                                "1": 26
                            },
                            "flags": {
                                "collapsed": true
                            },
                            "order": 6,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "image",
                                    "type": "IMAGE",
                                    "link": 50
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "IMAGE",
                                    "type": "IMAGE",
                                    "links": [
                                        57
                                    ],
                                    "shape": 3,
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "ImageInvert"
                            }
                        },
                        {
                            "id": 35,
                            "type": "EmptyLatentImage",
                            "pos": [
                                700,
                                610
                            ],
                            "size": {
                                "0": 315,
                                "1": 106
                            },
                            "flags": {},
                            "order": 1,
                            "mode": 0,
                            "outputs": [
                                {
                                    "name": "LATENT",
                                    "type": "LATENT",
                                    "links": [
                                        52
                                    ],
                                    "shape": 3,
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "EmptyLatentImage"
                            },
                            "widgets_values": [
                                680,
                                680,
                                1
                            ]
                        },
                        {
                            "id": 14,
                            "type": "CheckpointLoaderSimple",
                            "pos": [
                                -640,
                                110
                            ],
                            "size": {
                                "0": 315,
                                "1": 98
                            },
                            "flags": {},
                            "order": 2,
                            "mode": 0,
                            "outputs": [
                                {
                                    "name": "MODEL",
                                    "type": "MODEL",
                                    "links": [
                                        30
                                    ],
                                    "slot_index": 0
                                },
                                {
                                    "name": "CLIP",
                                    "type": "CLIP",
                                    "links": [
                                        20,
                                        46
                                    ],
                                    "slot_index": 1
                                },
                                {
                                    "name": "VAE",
                                    "type": "VAE",
                                    "links": [
                                        22
                                    ],
                                    "slot_index": 2
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "CheckpointLoaderSimple"
                            },
                            "widgets_values": [
                                options.model
                            ]
                        },
                        {
                            "id": 11,
                            "type": "LoadImage",
                            "pos": [
                                -351,
                                278
                            ],
                            "size": {
                                "0": 387.97003173828125,
                                "1": 465.5097961425781
                            },
                            "flags": {},
                            "order": 3,
                            "mode": 0,
                            "outputs": [
                                {
                                    "name": "IMAGE",
                                    "type": "IMAGE",
                                    "links": [
                                        50
                                    ],
                                    "slot_index": 0
                                },
                                {
                                    "name": "MASK",
                                    "type": "MASK",
                                    "links": [],
                                    "slot_index": 1
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "LoadImage"
                            },
                            "widgets_values": [
                                options.fileName,
                                "image"
                            ]
                        },
                        {
                            "id": 23,
                            "type": "KSamplerAdvanced",
                            "pos": [
                                1092,
                                117
                            ],
                            "size": {
                                "0": 315,
                                "1": 334
                            },
                            "flags": {},
                            "order": 8,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "model",
                                    "type": "MODEL",
                                    "link": 30
                                },
                                {
                                    "name": "positive",
                                    "type": "CONDITIONING",
                                    "link": 31
                                },
                                {
                                    "name": "negative",
                                    "type": "CONDITIONING",
                                    "link": 32
                                },
                                {
                                    "name": "latent_image",
                                    "type": "LATENT",
                                    "link": 52
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "LATENT",
                                    "type": "LATENT",
                                    "links": [
                                        34
                                    ],
                                    "shape": 3,
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "KSamplerAdvanced"
                            },
                            "widgets_values": [
                                "enable",
                                options.seed,
                                "randomize",
                                100,
                                options.cfgScale,
                                "dpmpp_2m",
                                "karras",
                                15,
                                70,
                                "disable"
                            ]
                        },
                        {
                            "id": 9,
                            "type": "SaveImage",
                            "pos": [
                                1750,
                                114
                            ],
                            "size": {
                                "0": 393.6202087402344,
                                "1": 449.1610107421875
                            },
                            "flags": {},
                            "order": 10,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "images",
                                    "type": "IMAGE",
                                    "link": 9
                                }
                            ],
                            "properties": {},
                            "widgets_values": [
                                "QRCode"
                            ]
                        },
                        {
                            "id": 8,
                            "type": "VAEDecode",
                            "pos": [
                                1473,
                                112
                            ],
                            "size": {
                                "0": 210,
                                "1": 46
                            },
                            "flags": {},
                            "order": 9,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "samples",
                                    "type": "LATENT",
                                    "link": 34
                                },
                                {
                                    "name": "vae",
                                    "type": "VAE",
                                    "link": 22
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
                            "id": 10,
                            "type": "ControlNetApply",
                            "pos": [
                                491,
                                -57
                            ],
                            "size": {
                                "0": 317.4000244140625,
                                "1": 98
                            },
                            "flags": {},
                            "order": 7,
                            "mode": 0,
                            "inputs": [
                                {
                                    "name": "conditioning",
                                    "type": "CONDITIONING",
                                    "link": 47
                                },
                                {
                                    "name": "control_net",
                                    "type": "CONTROL_NET",
                                    "link": 13
                                },
                                {
                                    "name": "image",
                                    "type": "IMAGE",
                                    "link": 57
                                }
                            ],
                            "outputs": [
                                {
                                    "name": "CONDITIONING",
                                    "type": "CONDITIONING",
                                    "links": [
                                        31
                                    ],
                                    "slot_index": 0
                                }
                            ],
                            "properties": {
                                "Node name for S&R": "ControlNetApply"
                            },
                            "widgets_values": [
                                1.3
                            ]
                        }
                    ],
                    "links": [
                        [
                            9,
                            8,
                            0,
                            9,
                            0,
                            "IMAGE"
                        ],
                        [
                            13,
                            12,
                            0,
                            10,
                            1,
                            "CONTROL_NET"
                        ],
                        [
                            20,
                            14,
                            1,
                            7,
                            0,
                            "CLIP"
                        ],
                        [
                            22,
                            14,
                            2,
                            8,
                            1,
                            "VAE"
                        ],
                        [
                            30,
                            14,
                            0,
                            23,
                            0,
                            "MODEL"
                        ],
                        [
                            31,
                            10,
                            0,
                            23,
                            1,
                            "CONDITIONING"
                        ],
                        [
                            32,
                            7,
                            0,
                            23,
                            2,
                            "CONDITIONING"
                        ],
                        [
                            34,
                            23,
                            0,
                            8,
                            0,
                            "LATENT"
                        ],
                        [
                            46,
                            14,
                            1,
                            6,
                            0,
                            "CLIP"
                        ],
                        [
                            47,
                            6,
                            0,
                            10,
                            0,
                            "CONDITIONING"
                        ],
                        [
                            50,
                            11,
                            0,
                            33,
                            0,
                            "IMAGE"
                        ],
                        [
                            52,
                            35,
                            0,
                            23,
                            3,
                            "LATENT"
                        ],
                        [
                            57,
                            33,
                            0,
                            10,
                            2,
                            "IMAGE"
                        ]
                    ],
                    "groups": [],
                    "config": {},
                    "extra": {},
                    "version": 0.4
                }
            }
        }
    }
}