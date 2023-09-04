export interface ILora {
    path: string;
    name: string;
    id: string;
    hash: string;
    shortName: string;
    link: string;
    baseModel: 'SD 1.5' | 'SDXL 1.0';
    aliases: string[];
}

export const LORAS_CONFIGS: ILora[] = [
    {
        path: 'add_detail.safetensors',
        name: 'Detail Tweaker LoRA',
        id: '58390',
        hash: '47AAAF0D29',
        shortName: 'add_detail',
        link: 'https://civitai.com/models/58390/detail-tweaker-lora-lora',
        baseModel: 'SD 1.5',
        aliases: ['add_detail'],
    },
    {
        path: 'LogoRedmond_LogoRedAF.safetensors',
        name: 'Logo.Redmond - Logo Lora for SD XL 1.0',
        id: '124609',
        hash: '8D22FAB0F7',
        shortName: 'logo',
        link: 'https://civitai.com/models/124609/logoredmond-logo-lora-for-sd-xl-10',
        baseModel: 'SDXL 1.0',
        aliases: ['LogoRedmond_LogoRedAF', 'logo'],
    }
];

export const getLoraByParam = (param: string) => {
    const model = LORAS_CONFIGS.find(m =>
        m.id === param ||
        m.hash === param ||
        m.shortName === param ||
        m.aliases.includes(param)
    );

    return model;
}

export const modelsAliases = [];