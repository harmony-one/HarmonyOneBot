export interface IModel {
    path: string;
    name: string;
    id: string;
    hash: string;
    shortName: string;
    link: string;
    baseModel: 'SD 1.5' | 'SDXL 1.0';
    aliases: string[];
    defaultPrompt: string;
    defaultImageUrl?: string;
}

export const MODELS_CONFIGS: IModel[] = [
    {
        path: 'sdXL_v10VAEFix.safetensors',
        name: 'SD XL',
        id: '101055',
        hash: 'E6BB9EA85B',
        shortName: 'sd-xl',
        link: 'https://civitai.com/models/101055/sd-xl',
        baseModel: 'SDXL 1.0',
        aliases: ['xl', '1010', 'he6b'],
        defaultPrompt: 'A cat is sitting in a kimono, in the style of renaissance - inspired chiaroscuro, hyper - realistic portraiture, nicolas mignard, old master influenced fantasy, portraitures with hidden meanings, dom qwek, art of burma',
    },
    {
        path: "deliberate_v2.safetensors",
        name: "Deliberate",
        id: '4823',
        hash: '9ABA26ABDF',
        shortName: 'deliberate',
        link: 'https://civitai.com/models/4823/deliberate',
        baseModel: 'SD 1.5',
        aliases: ['del', '4823', 'h9ab'],
        defaultPrompt: 'a cute kitten made out of metal, (cyborg:1.1), ([tail | detailed wire]:1.3), (intricate details), hdr, (intricate details, hyperdetailed:1.2), cinematic shot, vignette, centered',
    },
    {
        path: "dreamshaper_8.safetensors",
        name: "DreamShaper",
        id: '4384',
        hash: '879DB523C3',
        shortName: 'dreamshaper',
        link: 'https://civitai.com/models/4384/dreamshaper',
        baseModel: 'SD 1.5',
        aliases: ['dream', '4384', 'h879'],
        defaultPrompt: '8k portrait of beautiful cyborg with brown hair, intricate, elegant, highly detailed, majestic, digital photography, art by artgerm and ruan jia and greg rutkowski surreal painting gold butterfly filigree, broken glass, (masterpiece, sidelighting, finely detailed beautiful eyes: 1.2), hdr, <lora:more_details:0.36>'
    },
    {
        path: "majicmixRealistic_betterV2V25.safetensors",
        name: 'majicMIX realistic 麦橘写实',
        id: '43331',
        hash: 'D7E2AC2F4A',
        shortName: 'majicmix-realistic',
        link: 'https://civitai.com/models/43331/majicmix-realistic',
        baseModel: 'SD 1.5',
        aliases: ['majic', '4333', 'h7e2'],
        defaultPrompt: '1girl,sitting on a cozy couch,crossing legs,soft light'
    },
    {
        path: "revAnimated_v122.safetensors",
        name: 'ReV Animated',
        id: '7371',
        hash: '4199BCDD14',
        shortName: 'rev-animated',
        link: 'https://civitai.com/models/7371/rev-animated',
        baseModel: 'SD 1.5',
        aliases: ['rev', '7371', 'h419'],
        defaultPrompt: '((best quality)), ((masterpiece)), (detailed), alluring succubus, ethereal beauty, perched on a cloud, (fantasy illustration:1.3), enchanting gaze, captivating pose, delicate wings, otherworldly charm, mystical sky, (Luis Royo:1.2), (Yoshitaka Amano:1.1), moonlit night, soft colors, (detailed cloudscape:1.3), (high-resolution:1.2)'
    },
    // {
    //     path: "v1-5-pruned-emaonly.safetensors",
    //     name: '',
    //     id: '',
    //     hash: '',
    //     shortName: '',
    //     link: '',
    //     baseModel: 'SD 1.5'
    // },
    {
        path: "animePastelDream_softBakedVae.safetensors",
        name: 'Anime Pastel Dream',
        id: '23521',
        hash: '4BE38C1A17',
        shortName: 'anime-pastel-dream',
        link: 'https://civitai.com/models/23521/anime-pastel-dream',
        baseModel: 'SD 1.5',
        aliases: ['anime', '2352', 'h4be'],
        defaultPrompt: 'masterpiece, best quality, ultra-detailed, illustration,(1girl),beautiful detailed eyes, looking at viewer, close up, (breast focus), pink hair, shy, cat ears'
    },
    {
        path: 'cyberrealistic_v33.safetensors',
        name: 'CyberRealistic',
        id: '15003',
        hash: '7A4DBBA12F',
        shortName: 'cyberrealistic',
        link: 'https://civitai.com/models/15003/cyberrealistic',
        baseModel: 'SD 1.5',
        aliases: ['real', '1500', 'h7a4'],
        defaultPrompt: '<lora:LowRA:0.6> (8k, RAW photo, highest quality), beautiful girl, close up, dress, (detailed eyes:0.8), defiance512, (looking at the camera:1.4), (highest quality), (best shadow), intricate details, interior, ginger hair:1.3, dark studio, muted colors, freckles   <lora:epiNoiseoffset_v2Pynoise:1.2>',
    },
    {
        path: 'dreamshaperXL10_alpha2Xl10.safetensors',
        name: 'DreamShaper XL1.0',
        id: '112902',
        hash: '0F1B80CFE8',
        shortName: 'dreamshaper-xl10',
        link: 'https://civitai.com/models/112902/dreamshaper-xl10',
        baseModel: 'SDXL 1.0',
        aliases: ['xl_dream', '1129', 'h0f1'],
        defaultPrompt: 'barry allen the flash on wheelchair moving at supersonic speed creating flame trails, speed trails, motion blur, electricity speed outdoor, realistic highly detailed cinematic cinematography, movie shots footage,',
    },
    {
        path: 'sdxlUnstableDiffusers_v5UnchainedSlayer.safetensors',
        name: 'SDXL Unstable Diffusers ☛ YamerMIX',
        id: '84040',
        hash: 'EF924AAE79',
        shortName: 'sdxl-unstable-diffusers-yamermix',
        link: 'https://civitai.com/models/84040/sdxl-unstable-diffusers-yamermix',
        baseModel: 'SDXL 1.0',
        aliases: ['xl_dif', '8404', 'hef9'],
        defaultPrompt: 'pastel color, from above, upper body, depth of field, masterpiece, best quality, best quality, 1girl sitting on a swing, school uniform, black hair, blue eyes, autumn, park'
    }
];

export const getModelByParam = (param: string) => {
    const model = MODELS_CONFIGS.find(m =>
        m.id === param ||
        m.hash === param ||
        m.shortName === param ||
        m.aliases.includes(param)
    );

    return model;
}

export const modelsAliases = [];