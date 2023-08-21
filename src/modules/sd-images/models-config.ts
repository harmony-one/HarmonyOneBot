export const MODELS_CONFIGS = [
    {
        path: "deliberate_v2.safetensors",
        name: "Deliberate",
        id: '4823',
        hash: '9ABA26ABDF',
        shortName: 'deliberate',
        link: 'https://civitai.com/models/4823/deliberate',
        baseModel: 'SD 1.5'
    },
    {
        path: "dreamshaper_8.safetensors",
        name: "DreamShaper",
        id: '4384',
        hash: '879DB523C3',
        shortName: 'dreamshaper',
        link: 'https://civitai.com/models/4384/dreamshaper',
        baseModel: 'SD 1.5'
    },
    {
        path: "majicmixRealistic_betterV2V25.safetensors",
        name: 'majicMIX realistic 麦橘写实',
        id: '43331',
        hash: 'D7E2AC2F4A',
        shortName: 'majicmix-realistic',
        link: 'https://civitai.com/models/43331/majicmix-realistic',
        baseModel: 'SD 1.5'
    },
    {
        path: "revAnimated_v122.safetensors",
        name: 'ReV Animated',
        id: '7371',
        hash: '4199BCDD14',
        shortName: 'rev-animated',
        link: 'https://civitai.com/models/7371/rev-animated',
        baseModel: 'SD 1.5'
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
        baseModel: 'SD 1.5'
    },
    {
        path: 'cyberrealistic_v33.safetensors',
        name: 'CyberRealistic',
        id: '15003',
        hash: '7A4DBBA12F',
        shortName: 'cyberrealistic',
        link: 'https://civitai.com/models/15003/cyberrealistic',
        baseModel: 'SD 1.5'
    },
    {
        path: 'dreamshaperXL10_alpha2Xl10.safetensors',
        name: 'DreamShaper XL1.0',
        id: '112902',
        hash: '0F1B80CFE8',
        shortName: 'dreamshaper-xl10',
        link: 'https://civitai.com/models/112902/dreamshaper-xl10',
        baseModel: 'SDXL 1.0'
    },
    {
        path: 'sdXL_v10VAEFix.safetensors',
        name: 'SD XL',
        id: '101055',
        hash: 'E6BB9EA85B',
        shortName: 'sd-xl',
        link: 'https://civitai.com/models/101055/sd-xl',
        baseModel: 'SDXL 1.0'
    },
    {
        path: 'sdxlUnstableDiffusers_v5UnchainedSlayer.safetensors',
        name: 'SDXL Unstable Diffusers ☛ YamerMIX',
        id: '84040',
        hash: 'EF924AAE79',
        shortName: 'sdxl-unstable-diffusers-yamermix',
        link: 'https://civitai.com/models/84040/sdxl-unstable-diffusers-yamermix',
        baseModel: 'SDXL 1.0'
    }
];

export const getModelByParam = (param: string) => {
    const model = MODELS_CONFIGS.find(m => m.id ===  param || m.hash === param || m.shortName === param);    

    return model;
}