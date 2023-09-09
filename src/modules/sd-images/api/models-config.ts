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
        defaultPrompt: 'A bunny is sitting in a kimono, in the style of renaissance - inspired chiaroscuro, hyper - realistic portraiture, nicolas mignard, old master influenced fantasy, portraitures with hidden meanings, dom qwek, art of burma',
    },
    {
        path: "deliberate_v2.safetensors",
        name: "Deliberate",
        id: '4823',
        hash: '9ABA26ABDF',
        shortName: 'deliberate',
        link: 'https://civitai.com/models/4823/deliberate',
        baseModel: 'SD 1.5',
        aliases: ['d', 'del', '4823', 'h9ab'],
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
        aliases: ['magic', 'rev', '7371', 'h419'],
        defaultPrompt: 'best quality, ultra high res, photorealistic, sfw, armored wizard, magical tattoos, apprentice, 1girl, looking at viewer, upper body, slender, small breasts, purple hair with white stripes, white croptop, (dark and moody universe:1.3), (elden ring style:1.3), (warhammer style:1.1), floating rocks, glowing pebbles, fiery dust, concept artist, global illumination, depth of field, gloomy, unsettling, splash art, art by artgerm and greg rutkowski and viktoria gavrilenko, scary smile, purple light, rule of the thirds --cfg 8.5 --steps 30 --seed 1463146050 --d 1280x853 --no girls, (worst quality:1.2), (low quality:1.2), (lowres:1.1), (monochrome:1.1), (greyscale), multiple views, comic, sketch, (((bad anatomy))), (((deformed))), (((disfigured))), watermark, multiple_views, mutation hands, mutation fingers, extra fingers, missing fingers, watermark'
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
        aliases: ['n', 'an', 'anime', '2352', 'h4be'],
        defaultPrompt: 'masterpiece, best quality, ultra-detailed, illustration, beautiful detailed eyes, looking at viewer, close up, pink hair, shy, cat ears'
    },
    {
        path: 'cyberrealistic_v33.safetensors',
        name: 'CyberRealistic',
        id: '15003',
        hash: '7A4DBBA12F',
        shortName: 'cyberrealistic',
        link: 'https://civitai.com/models/15003/cyberrealistic',
        baseModel: 'SD 1.5',
        aliases: ['cyber', '1500', 'h7a4'],
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
        defaultPrompt: 'pastel color, from above, upper body, depth of field, masterpiece, best quality, best quality, girl sitting on a swing, school uniform, black hair, blue eyes, autumn, park'
    },
    {
        path: "lyriel.safetensors",
        name: "lyriel",
        id: '22922',
        hash: 'EC6F68EA63',
        shortName: 'lyriel',
        link: 'https://civitai.com/models/22922/lyriel',
        baseModel: 'SD 1.5',
        aliases: ['lyr'],
        defaultPrompt: '(dark shot:1.1), epic realistic, RAW, analog, A full portrait of stunning woman wearing swimsuit, alluring expression, swimming pool, clear water, wet hair, natural look, no make up, pureerosface_v1, masterpiece that captures the essence and beauty of the woman and water, ((highly detailed skin, skin details, water details)), sharp focus, volumetric fog, 8k UHD, DSLR, high quality, film grain, Fujifilm XT3, art by greg rutkowski and artgerm, soft cinematic light, adobe lightroom, photolab, hdr, intricate, highly detailed, (depth of field:1.4), faded, (neutral colors:1.2), (hdr:1.4), (muted colors:1.2), hyperdetailed, (artstation:1.4), cinematic, warm lights, dramatic light, (intricate details:1.1), complex background, (rutkowski:0.66), (teal and orange:0.4), (natural skin texture, hyperrealism, soft light, sharp)',
    },
    {
        path: "leosams_helloworld.safetensors",
        name: "leosams_helloworld",
        id: '43977',
        hash: 'BCFD4AA1C0',
        shortName: 'helloworld',
        link: 'https://civitai.com/models/43977/moonmix',
        baseModel: 'SDXL 1.0',
        aliases: ['leo', 'real'],
        defaultPrompt: 'leogirl, realistic photography, The Joker, shrouded in carnival-esque, multicolored spotlights, stands in the middle of a chaotic circus tent. His manic grin becomes even more unsettling under the harsh, unnatural lighting, close up, perfecteyes --no (worst quality, low quality), deformed, distorted, disfigured, doll, poorly drawn, bad anatomy, wrong anatomy --cfg 7 --steps 40 --seed 3912625479 --d 832x1344',
    },
    {
        path: "perfect_world.safetensors",
        name: "perfect_world",
        id: '8281',
        hash: 'B4C1D10A2D',
        shortName: 'perfect_world',
        link: 'https://civitai.com/models/8281/perfect-world',
        baseModel: 'SDXL 1.0', // baseModel is listed as 'other'
        aliases: ['nsfw', 'perf'],
        defaultPrompt: '(masterpiece:1.2), (best quality:1.2), 1woman, 1boy, short hair, blonde hair, breast focus, slim and petite body, nude, black stockings, black high heels, silver necklace, orgasm, mouth open, aroused, <lora:murkysSuspendedOn_1:0.9>, suspendedonpenisms, sex, arm grab, sex from behind, dangling legs, size difference, in the luxurious living room, --no (worst quality:1.2), (bad quality:1.2), (poor quality:1.2), bad artist, extra limbs, bad anatomy, missing legs --seed 780544502378871 --steps 20 --sampler euler --cfg 8 --d 512x512'
    },
    {
        path: "reliberate.safetensors",
        name: "reliberate",
        id: '79754',
        hash: '6B08E2C182',
        shortName: 'reliberate',
        link: 'https://civitai.com/models/79754/reliberate',
        baseModel: 'SD 1.5',
        aliases: ['rel'],
        defaultPrompt: '(hdr:1.4), professional photograph of an arab man worker, 80mm, desert, barren landscape, medium closeup, moles skin, soft light, sharp, exposure, muted colors, dim colors, soothing tones',
    },
    {
        path: "a-zovya_rpg_artist_tools.safetensors",
        name: "rpg_artist_tools",
        id: '8124',
        hash: '25BA966C5D',
        shortName: 'rpg_artist_tools',
        link: 'https://civitai.com/models/8124',
        baseModel: 'SD 1.5',
        aliases: ['rpg'],
        defaultPrompt: 'dungeons and dragons epic movie poster barbarian woman with cape charging into battle violent roar riding a vicious ice [wolf|tiger] beast leather and fur boots warriors and red banners (windy dust debris storm:1.1) volumetric lighting fog depth mist pass z pass great stone castle very bright morning sunlight from side, (masterpiece) (best quality) (detailed) (8k) (cinematic lighting) (sharp focus) (intricate)',
    },
    {
        path: "chilloutmix.safetensors",
        name: "chilloutmix",
        id: '6424',
        hash: 'FC2511737A',
        shortName: 'chillout',
        link: 'https://civitai.com/models/6424/chilloutmix',
        baseModel: 'SD 1.5',
        aliases: ['chill'],
        defaultPrompt: '(RAW photo, best quality), (realistic, photo-realistic:1.3), masterpiece, an extremely delicate and beautiful, extremely detailed, CG, unity , 2k wallpaper, Amazing, finely detail, light smile, extremely detailed CG unity 8k wallpaper, huge filesize, ultra-detailed, highres, absurdres, soft light, (((medium hair:1.3), short bang, pink hair, floating hair novafrogstyle)), beautiful detailed girl, detailed fingers, extremely detailed eyes and face, beautiful detailed nose, beautiful detailed eyes, long eyelashes, light on face, looking at viewer, (closed mouth:1.2), 1girl, cute, young, mature face, (full body:1.3), ((small breasts)), realistic face, realistic body, beautiful detailed thigh, (ulzzang-6500-v1.1:0.8), <lora:koreanDollLikeness_v15:0.4>, business suit, cross-laced clothes, collared shirt, open clothes, in office, detailed office, open cardigan, black thighhighs, miniskirt, black underwear, unbuttoned shirt,',
    },
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