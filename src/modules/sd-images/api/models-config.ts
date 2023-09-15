export interface IModel {
  path: string
  name: string
  id: string
  hash?: string
  shortName: string
  link: string
  baseModel: 'SD 1.5' | 'SDXL 1.0' | 'Other' | 'SD 1.4'
  aliases: string[]
  defaultPrompt: string
  defaultImageUrl?: string
}

export let MODELS_CONFIGS: IModel[] = [
  {
    "path": "sdXL_v10VAEFix.safetensors",
    "name": "SD XL",
    "id": "101055",
    "hash": "E6BB9EA85B",
    "shortName": "sd-xl",
    "link": "https://civitai.com/models/101055/sd-xl",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "1",
      "xl",
      "1010",
      "he6b"
    ],
    "defaultPrompt": "A bunny is sitting in a kimono, in the style of renaissance - inspired chiaroscuro, hyper - realistic portraiture, nicolas mignard, old master influenced fantasy, portraitures with hidden meanings, dom qwek, art of burma"
  },
  {
    "path": "150851.safetensors",
    "name": "leosams_helloworld",
    "id": "43977",
    "hash": "BCFD4AA1C0",
    "shortName": "helloworld",
    "link": "https://civitai.com/models/43977/moonmix",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "2",
      "leo",
      "real"
    ],
    "defaultPrompt": "leogirl, realistic photography, The Joker, shrouded in carnival-esque, multicolored spotlights, stands in the middle of a chaotic circus tent. His manic grin becomes even more unsettling under the harsh, unnatural lighting, close up, perfecteyes --no (worst quality, low quality), deformed, distorted, disfigured, doll, poorly drawn, bad anatomy, wrong anatomy --cfg 7 --steps 40 --seed 3912625479 --d 832x1344"
  },
  {
    "path": "128713.safetensors",
    "name": "DreamShaper",
    "id": "4384",
    "hash": "879DB523C3",
    "shortName": "dreamshaper",
    "link": "https://civitai.com/models/4384/dreamshaper",
    "baseModel": "SD 1.5",
    "aliases": [
      "3",
      "dream",
      "4384",
      "h879"
    ],
    "defaultPrompt": "8k portrait of beautiful cyborg with brown hair, intricate, elegant, highly detailed, majestic, digital photography, art by artgerm and ruan jia and greg rutkowski surreal painting gold butterfly filigree, broken glass, (masterpiece, sidelighting, finely detailed beautiful eyes: 1.2), hdr, <lora:more_details:0.36>"
  },
  {
    "path": "129687.safetensors",
    "name": "perfect_world",
    "id": "8281",
    "hash": "B4C1D10A2D",
    "shortName": "perfect_world",
    "link": "https://civitai.com/models/8281/perfect-world",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "4",
      "nsfw",
      "perf"
    ],
    "defaultPrompt": "(masterpiece:1.2), (best quality:1.2), 1woman, 1boy, short hair, blonde hair, breast focus, slim and petite body, nude, black stockings, black high heels, silver necklace, orgasm, mouth open, aroused, <lora:murkysSuspendedOn_1:0.9>, suspendedonpenisms, sex, arm grab, sex from behind, dangling legs, size difference, in the luxurious living room, --no (worst quality:1.2), (bad quality:1.2), (poor quality:1.2), bad artist, extra limbs, bad anatomy, missing legs --seed 780544502378871 --steps 20 --sampler euler --cfg 8 --d 512x512"
  },
  {
    "path": "156110.safetensors",
    "name": "Deliberate",
    "id": "4823",
    "hash": "9ABA26ABDF",
    "shortName": "deliberate",
    "link": "https://civitai.com/models/4823/deliberate",
    "baseModel": "SD 1.5",
    "aliases": [
      "5",
      "d",
      "del",
      "4823",
      "h9ab"
    ],
    "defaultPrompt": "a cute kitten made out of metal, (cyborg:1.1), ([tail | detailed wire]:1.3), (intricate details), hdr, (intricate details, hyperdetailed:1.2), cinematic shot, vignette, centered"
  },
  {
    "path": "126470.safetensors",
    "name": "majicMIX realistic 麦橘写实",
    "id": "43331",
    "hash": "D7E2AC2F4A",
    "shortName": "majicmix-realistic",
    "link": "https://civitai.com/models/43331/majicmix-realistic",
    "baseModel": "SD 1.5",
    "aliases": [
      "6",
      "majic",
      "4333",
      "h7e2"
    ],
    "defaultPrompt": "1girl,sitting on a cozy couch,crossing legs,soft light"
  },
  {
    "path": "148515.safetensors",
    "name": "SDXL Unstable Diffusers ☛ YamerMIX",
    "id": "84040",
    "hash": "EF924AAE79",
    "shortName": "sdxl-unstable-diffusers-yamermix",
    "link": "https://civitai.com/models/84040/sdxl-unstable-diffusers-yamermix",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "7",
      "xl_dif",
      "8404",
      "hef9"
    ],
    "defaultPrompt": "pastel color, from above, upper body, depth of field, masterpiece, best quality, best quality, girl sitting on a swing, school uniform, black hair, blue eyes, autumn, park"
  },
  {
    "path": "46846.safetensors",
    "name": "ReV Animated",
    "id": "7371",
    "hash": "4199BCDD14",
    "shortName": "rev-animated",
    "link": "https://civitai.com/models/7371/rev-animated",
    "baseModel": "SD 1.5",
    "aliases": [
      "8",
      "magic",
      "rev",
      "7371",
      "h419"
    ],
    "defaultPrompt": "best quality, ultra high res, photorealistic, sfw, armored wizard, magical tattoos, apprentice, 1girl, looking at viewer, upper body, slender, small breasts, purple hair with white stripes, white croptop, (dark and moody universe:1.3), (elden ring style:1.3), (warhammer style:1.1), floating rocks, glowing pebbles, fiery dust, concept artist, global illumination, depth of field, gloomy, unsettling, splash art, art by artgerm and greg rutkowski and viktoria gavrilenko, scary smile, purple light, rule of the thirds --cfg 8.5 --steps 30 --seed 1463146050 --d 1280x853 --no girls, (worst quality:1.2), (low quality:1.2), (lowres:1.1), (monochrome:1.1), (greyscale), multiple views, comic, sketch, (((bad anatomy))), (((deformed))), (((disfigured))), watermark, multiple_views, mutation hands, mutation fingers, extra fingers, missing fingers, watermark"
  },
  {
    "path": "138176.safetensors",
    "name": "CyberRealistic",
    "id": "15003",
    "hash": "7A4DBBA12F",
    "shortName": "cyberrealistic",
    "link": "https://civitai.com/models/15003/cyberrealistic",
    "baseModel": "SD 1.5",
    "aliases": [
      "9",
      "cyber",
      "1500",
      "h7a4"
    ],
    "defaultPrompt": "<lora:LowRA:0.6> (8k, RAW photo, highest quality), beautiful girl, close up, dress, (detailed eyes:0.8), defiance512, (looking at the camera:1.4), (highest quality), (best shadow), intricate details, interior, ginger hair:1.3, dark studio, muted colors, freckles   <lora:epiNoiseoffset_v2Pynoise:1.2>"
  },
  {
    "path": "126688.safetensors",
    "name": "DreamShaper XL1.0",
    "id": "112902",
    "hash": "0F1B80CFE8",
    "shortName": "dreamshaper-xl10",
    "link": "https://civitai.com/models/112902/dreamshaper-xl10",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "10",
      "xl_dream",
      "1129",
      "h0f1"
    ],
    "defaultPrompt": "barry allen the flash on wheelchair moving at supersonic speed creating flame trails, speed trails, motion blur, electricity speed outdoor, realistic highly detailed cinematic cinematography, movie shots footage,"
  },
  {
    "path": "72396.safetensors",
    "name": "lyriel",
    "id": "22922",
    "hash": "EC6F68EA63",
    "shortName": "lyriel",
    "link": "https://civitai.com/models/22922/lyriel",
    "baseModel": "SD 1.5",
    "aliases": [
      "11",
      "lyr"
    ],
    "defaultPrompt": "(dark shot:1.1), epic realistic, RAW, analog, A full portrait of stunning woman wearing swimsuit, alluring expression, swimming pool, clear water, wet hair, natural look, no make up, pureerosface_v1, masterpiece that captures the essence and beauty of the woman and water, ((highly detailed skin, skin details, water details)), sharp focus, volumetric fog, 8k UHD, DSLR, high quality, film grain, Fujifilm XT3, art by greg rutkowski and artgerm, soft cinematic light, adobe lightroom, photolab, hdr, intricate, highly detailed, (depth of field:1.4), faded, (neutral colors:1.2), (hdr:1.4), (muted colors:1.2), hyperdetailed, (artstation:1.4), cinematic, warm lights, dramatic light, (intricate details:1.1), complex background, (rutkowski:0.66), (teal and orange:0.4), (natural skin texture, hyperrealism, soft light, sharp)"
  },
  {
    "path": "135166.safetensors",
    "name": "reliberate",
    "id": "79754",
    "hash": "6B08E2C182",
    "shortName": "reliberate",
    "link": "https://civitai.com/models/79754/reliberate",
    "baseModel": "SD 1.5",
    "aliases": [
      "12",
      "rel"
    ],
    "defaultPrompt": "(hdr:1.4), professional photograph of an arab man worker, 80mm, desert, barren landscape, medium closeup, moles skin, soft light, sharp, exposure, muted colors, dim colors, soothing tones"
  },
  {
    "path": "79290.safetensors",
    "name": "rpg_artist_tools",
    "id": "8124",
    "hash": "25BA966C5D",
    "shortName": "rpg_artist_tools",
    "link": "https://civitai.com/models/8124",
    "baseModel": "SD 1.5",
    "aliases": [
      "13",
      "rpg"
    ],
    "defaultPrompt": "dungeons and dragons epic movie poster barbarian woman with cape charging into battle violent roar riding a vicious ice [wolf|tiger] beast leather and fur boots warriors and red banners (windy dust debris storm:1.1) volumetric lighting fog depth mist pass z pass great stone castle very bright morning sunlight from side, (masterpiece) (best quality) (detailed) (8k) (cinematic lighting) (sharp focus) (intricate)"
  },
  {
    "path": "11745.safetensors",
    "name": "chilloutmix",
    "id": "6424",
    "hash": "FC2511737A",
    "shortName": "chillout",
    "link": "https://civitai.com/models/6424/chilloutmix",
    "baseModel": "SD 1.5",
    "aliases": [
      "14",
      "chill"
    ],
    "defaultPrompt": "(RAW photo, best quality), (realistic, photo-realistic:1.3), masterpiece, an extremely delicate and beautiful, extremely detailed, CG, unity , 2k wallpaper, Amazing, finely detail, light smile, extremely detailed CG unity 8k wallpaper, huge filesize, ultra-detailed, highres, absurdres, soft light, (((medium hair:1.3), short bang, pink hair, floating hair novafrogstyle)), beautiful detailed girl, detailed fingers, extremely detailed eyes and face, beautiful detailed nose, beautiful detailed eyes, long eyelashes, light on face, looking at viewer, (closed mouth:1.2), 1girl, cute, young, mature face, (full body:1.3), ((small breasts)), realistic face, realistic body, beautiful detailed thigh, (ulzzang-6500-v1.1:0.8), <lora:koreanDollLikeness_v15:0.4>, business suit, cross-laced clothes, collared shirt, open clothes, in office, detailed office, open cardigan, black thighhighs, miniskirt, black underwear, unbuttoned shirt,"
  },
  {
    "path": "76907.safetensors",
    "name": "GhostMix",
    "id": "36520",
    "shortName": "GhostMix",
    "link": "https://civitai.com/models/36520",
    "baseModel": "SD 1.5",
    "aliases": [
      "15",
      "36520",
      "76907"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "64094.safetensors",
    "name": "NeverEnding Dream (NED)",
    "id": "10028",
    "shortName": "NeverEnding Dream (NED)",
    "link": "https://civitai.com/models/10028",
    "baseModel": "SD 1.5",
    "aliases": [
      "16",
      "10028",
      "64094"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "105924.safetensors",
    "name": "Cetus-Mix",
    "id": "6755",
    "shortName": "Cetus-Mix",
    "link": "https://civitai.com/models/6755",
    "baseModel": "SD 1.5",
    "aliases": [
      "17",
      "6755",
      "105924"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "61372.safetensors",
    "name": "Babes",
    "id": "2220",
    "shortName": "Babes",
    "link": "https://civitai.com/models/2220",
    "baseModel": "SD 1.5",
    "aliases": [
      "18",
      "2220",
      "61372"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "154252.safetensors",
    "name": "CuteYukiMix(特化可爱风格adorable style）",
    "id": "28169",
    "shortName": "CuteYukiMix(特化可爱风格adorable style）",
    "link": "https://civitai.com/models/28169",
    "baseModel": "SD 1.5",
    "aliases": [
      "19",
      "28169",
      "154252"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "106922.safetensors",
    "name": "Hassaku (hentai model)",
    "id": "2583",
    "shortName": "Hassaku (hentai model)",
    "link": "https://civitai.com/models/2583",
    "baseModel": "SD 1.5",
    "aliases": [
      "20",
      "2583",
      "106922"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "160989.safetensors",
    "name": "epiCRealism",
    "id": "25694",
    "shortName": "epiCRealism",
    "link": "https://civitai.com/models/25694",
    "baseModel": "SD 1.5",
    "aliases": [
      "21",
      "25694",
      "160989"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "100675.safetensors",
    "name": "MeinaHentai",
    "id": "12606",
    "shortName": "MeinaHentai",
    "link": "https://civitai.com/models/12606",
    "baseModel": "SD 1.5",
    "aliases": [
      "22",
      "12606",
      "100675"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "156771.safetensors",
    "name": "Indigo Furry mix",
    "id": "34469",
    "shortName": "Indigo Furry mix",
    "link": "https://civitai.com/models/34469",
    "baseModel": "SD 1.5",
    "aliases": [
      "23",
      "34469",
      "156771"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "160423.safetensors",
    "name": "BB95 Furry Mix",
    "id": "17649",
    "shortName": "BB95 Furry Mix",
    "link": "https://civitai.com/models/17649",
    "baseModel": "SD 1.5",
    "aliases": [
      "24",
      "17649",
      "160423"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "93208.safetensors",
    "name": "Dark Sushi Mix 大颗寿司Mix",
    "id": "24779",
    "shortName": "Dark Sushi Mix 大颗寿司Mix",
    "link": "https://civitai.com/models/24779",
    "baseModel": "SD 1.5",
    "aliases": [
      "25",
      "24779",
      "93208"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "132760.safetensors",
    "name": "AbsoluteReality",
    "id": "81458",
    "shortName": "AbsoluteReality",
    "link": "https://civitai.com/models/81458",
    "baseModel": "SD 1.5",
    "aliases": [
      "26",
      "81458",
      "132760"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "160495.safetensors",
    "name": "Analog Madness - Realistic model",
    "id": "8030",
    "shortName": "Analog Madness - Realistic model",
    "link": "https://civitai.com/models/8030",
    "baseModel": "SD 1.5",
    "aliases": [
      "27",
      "8030",
      "160495"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "119057.safetensors",
    "name": "MeinaMix",
    "id": "7240",
    "shortName": "MeinaMix",
    "link": "https://civitai.com/models/7240",
    "baseModel": "SD 1.5",
    "aliases": [
      "28",
      "7240",
      "119057"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "5038.safetensors",
    "name": "AbyssOrangeMix2 - Hardcore",
    "id": "4451",
    "shortName": "AbyssOrangeMix2 - Hardcore",
    "link": "https://civitai.com/models/4451",
    "baseModel": "SD 1.5",
    "aliases": [
      "29",
      "4451",
      "5038"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "86698.safetensors",
    "name": "PerfectDeliberate",
    "id": "24350",
    "shortName": "PerfectDeliberate",
    "link": "https://civitai.com/models/24350",
    "baseModel": "SD 1.5",
    "aliases": [
      "30",
      "24350",
      "86698"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "106289.safetensors",
    "name": "国风3 GuoFeng3",
    "id": "10415",
    "shortName": "国风3 GuoFeng3",
    "link": "https://civitai.com/models/10415",
    "baseModel": "SD 1.5",
    "aliases": [
      "31",
      "10415",
      "106289"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "90072.safetensors",
    "name": "Photon",
    "id": "84728",
    "shortName": "Photon",
    "link": "https://civitai.com/models/84728",
    "baseModel": "SD 1.5",
    "aliases": [
      "32",
      "84728",
      "90072"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "75209.safetensors",
    "name": "majicMIX sombre 麦橘唯美",
    "id": "62778",
    "shortName": "majicMIX sombre 麦橘唯美",
    "link": "https://civitai.com/models/62778",
    "baseModel": "SD 1.5",
    "aliases": [
      "33",
      "62778",
      "75209"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "121557.safetensors",
    "name": "ICBINP - \"I Can't Believe It's Not Photography\"",
    "id": "28059",
    "shortName": "ICBINP - \"I Can't Believe It's Not Photography\"",
    "link": "https://civitai.com/models/28059",
    "baseModel": "SD 1.5",
    "aliases": [
      "34",
      "28059",
      "121557"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "49055.safetensors",
    "name": "majicMIX fantasy 麦橘幻想",
    "id": "41865",
    "shortName": "majicMIX fantasy 麦橘幻想",
    "link": "https://civitai.com/models/41865",
    "baseModel": "SD 1.5",
    "aliases": [
      "35",
      "41865",
      "49055"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "99805.safetensors",
    "name": "A-Zovya Photoreal",
    "id": "57319",
    "shortName": "A-Zovya Photoreal",
    "link": "https://civitai.com/models/57319",
    "baseModel": "SD 1.5",
    "aliases": [
      "36",
      "57319",
      "99805"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "102222.safetensors",
    "name": "XXMix_9realistic",
    "id": "47274",
    "shortName": "XXMix_9realistic",
    "link": "https://civitai.com/models/47274",
    "baseModel": "SD 1.5",
    "aliases": [
      "37",
      "47274",
      "102222"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "95489.safetensors",
    "name": "AnyLoRA - Checkpoint",
    "id": "23900",
    "shortName": "AnyLoRA - Checkpoint",
    "link": "https://civitai.com/models/23900",
    "baseModel": "SD 1.5",
    "aliases": [
      "38",
      "23900",
      "95489"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "108289.safetensors",
    "name": "MeinaPastel",
    "id": "11866",
    "shortName": "MeinaPastel",
    "link": "https://civitai.com/models/11866",
    "baseModel": "SD 1.5",
    "aliases": [
      "39",
      "11866",
      "108289"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "89855.safetensors",
    "name": "majicMIX lux 麦橘奇幻",
    "id": "56967",
    "shortName": "majicMIX lux 麦橘奇幻",
    "link": "https://civitai.com/models/56967",
    "baseModel": "SD 1.5",
    "aliases": [
      "40",
      "56967",
      "89855"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "57618.safetensors",
    "name": " Counterfeit-V3.0",
    "id": "4468",
    "shortName": " Counterfeit-V3.0",
    "link": "https://civitai.com/models/4468",
    "baseModel": "SD 1.5",
    "aliases": [
      "41",
      "4468",
      "57618"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "155642.safetensors",
    "name": "Aniverse",
    "id": "107842",
    "shortName": "Aniverse",
    "link": "https://civitai.com/models/107842",
    "baseModel": "SD 1.5",
    "aliases": [
      "42",
      "107842",
      "155642"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "130072.safetensors",
    "name": "Realistic Vision V5.1",
    "id": "4201",
    "shortName": "Realistic Vision V5.1",
    "link": "https://civitai.com/models/4201",
    "baseModel": "SD 1.5",
    "aliases": [
      "43",
      "4201",
      "130072"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "112809.safetensors",
    "name": "MeinaUnreal",
    "id": "18798",
    "shortName": "MeinaUnreal",
    "link": "https://civitai.com/models/18798",
    "baseModel": "SD 1.5",
    "aliases": [
      "44",
      "18798",
      "112809"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "115942.safetensors",
    "name": "Realisian",
    "id": "47130",
    "shortName": "Realisian",
    "link": "https://civitai.com/models/47130",
    "baseModel": "SD 1.5",
    "aliases": [
      "45",
      "47130",
      "115942"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "70458.safetensors",
    "name": "Henmix_Real",
    "id": "20282",
    "shortName": "Henmix_Real",
    "link": "https://civitai.com/models/20282",
    "baseModel": "SD 1.5",
    "aliases": [
      "46",
      "20282",
      "70458"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "150238.safetensors",
    "name": "Copax TimeLessXL - SDXL1.0",
    "id": "118111",
    "shortName": "Copax TimeLessXL - SDXL1.0",
    "link": "https://civitai.com/models/118111",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "47",
      "118111",
      "150238"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "59409.safetensors",
    "name": "ChikMix",
    "id": "9871",
    "shortName": "ChikMix",
    "link": "https://civitai.com/models/9871",
    "baseModel": "SD 1.5",
    "aliases": [
      "48",
      "9871",
      "59409"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "141866.safetensors",
    "name": "Dark Sushi 2.5D 大颗寿司2.5D",
    "id": "48671",
    "shortName": "Dark Sushi 2.5D 大颗寿司2.5D",
    "link": "https://civitai.com/models/48671",
    "baseModel": "SD 1.5",
    "aliases": [
      "49",
      "48671",
      "141866"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "130121.safetensors",
    "name": "DarkSun",
    "id": "58431",
    "shortName": "DarkSun",
    "link": "https://civitai.com/models/58431",
    "baseModel": "SD 1.5",
    "aliases": [
      "50",
      "58431",
      "130121"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "95214.safetensors",
    "name": "【Checkpoint】YesMix",
    "id": "9139",
    "shortName": "【Checkpoint】YesMix",
    "link": "https://civitai.com/models/9139",
    "baseModel": "SD 1.5",
    "aliases": [
      "51",
      "9139",
      "95214"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "116759.safetensors",
    "name": "TMND-Mix",
    "id": "27259",
    "shortName": "TMND-Mix",
    "link": "https://civitai.com/models/27259",
    "baseModel": "Other",
    "aliases": [
      "52",
      "27259",
      "116759"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "127207.safetensors",
    "name": "Juggernaut",
    "id": "46422",
    "shortName": "Juggernaut",
    "link": "https://civitai.com/models/46422",
    "baseModel": "SD 1.5",
    "aliases": [
      "53",
      "46422",
      "127207"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "90854.safetensors",
    "name": "万象熔炉 | Anything V5/Ink",
    "id": "9409",
    "shortName": "万象熔炉 | Anything V5/Ink",
    "link": "https://civitai.com/models/9409",
    "baseModel": "SD 1.5",
    "aliases": [
      "54",
      "9409",
      "90854"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "156263.safetensors",
    "name": "Ether Real Mix",
    "id": "18207",
    "shortName": "Ether Real Mix",
    "link": "https://civitai.com/models/18207",
    "baseModel": "SD 1.5",
    "aliases": [
      "55",
      "18207",
      "156263"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "127680.safetensors",
    "name": "Lucky Strike Mix",
    "id": "13034",
    "shortName": "Lucky Strike Mix",
    "link": "https://civitai.com/models/13034",
    "baseModel": "SD 1.5",
    "aliases": [
      "56",
      "13034",
      "127680"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "95199.safetensors",
    "name": "Fantexi_v0.9Beta",
    "id": "18427",
    "shortName": "Fantexi_v0.9Beta",
    "link": "https://civitai.com/models/18427",
    "baseModel": "SD 1.5",
    "aliases": [
      "57",
      "18427",
      "95199"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "108545.safetensors",
    "name": "Mistoon_Anime",
    "id": "24149",
    "shortName": "Mistoon_Anime",
    "link": "https://civitai.com/models/24149",
    "baseModel": "SD 1.5",
    "aliases": [
      "58",
      "24149",
      "108545"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "127416.safetensors",
    "name": "SXZ Luma",
    "id": "25831",
    "shortName": "SXZ Luma",
    "link": "https://civitai.com/models/25831",
    "baseModel": "SD 1.5",
    "aliases": [
      "59",
      "25831",
      "127416"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "17233.safetensors",
    "name": "AbyssOrangeMix3 (AOM3)",
    "id": "9942",
    "shortName": "AbyssOrangeMix3 (AOM3)",
    "link": "https://civitai.com/models/9942",
    "baseModel": "SD 1.5",
    "aliases": [
      "60",
      "9942",
      "17233"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "34559.safetensors",
    "name": "MIX-Pro-V4",
    "id": "7241",
    "shortName": "MIX-Pro-V4",
    "link": "https://civitai.com/models/7241",
    "baseModel": "Other",
    "aliases": [
      "61",
      "7241",
      "34559"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "158371.safetensors",
    "name": "ZavyChromaXL",
    "id": "119229",
    "shortName": "ZavyChromaXL",
    "link": "https://civitai.com/models/119229",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "62",
      "119229",
      "158371"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "75441.safetensors",
    "name": "maturemalemix",
    "id": "50882",
    "shortName": "maturemalemix",
    "link": "https://civitai.com/models/50882",
    "baseModel": "SD 1.5",
    "aliases": [
      "63",
      "50882",
      "75441"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "113479.safetensors",
    "name": "Beautiful Realistic Asians",
    "id": "25494",
    "shortName": "Beautiful Realistic Asians",
    "link": "https://civitai.com/models/25494",
    "baseModel": "SD 1.5",
    "aliases": [
      "64",
      "25494",
      "113479"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "6297.safetensors",
    "name": "Pastel-Mix [Stylized Anime Model]",
    "id": "5414",
    "shortName": "Pastel-Mix [Stylized Anime Model]",
    "link": "https://civitai.com/models/5414",
    "baseModel": "Other",
    "aliases": [
      "65",
      "5414",
      "6297"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "90599.safetensors",
    "name": "Colorful",
    "id": "7279",
    "shortName": "Colorful",
    "link": "https://civitai.com/models/7279",
    "baseModel": "SD 1.5",
    "aliases": [
      "66",
      "7279",
      "90599"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "159751.safetensors",
    "name": "RealCartoon3D",
    "id": "94809",
    "shortName": "RealCartoon3D",
    "link": "https://civitai.com/models/94809",
    "baseModel": "SD 1.5",
    "aliases": [
      "67",
      "94809",
      "159751"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "142125.safetensors",
    "name": "Clarity",
    "id": "5062",
    "shortName": "Clarity",
    "link": "https://civitai.com/models/5062",
    "baseModel": "SD 1.5",
    "aliases": [
      "68",
      "5062",
      "142125"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "6087.safetensors",
    "name": "Kotosmix",
    "id": "5245",
    "shortName": "Kotosmix",
    "link": "https://civitai.com/models/5245",
    "baseModel": "SD 1.5",
    "aliases": [
      "69",
      "5245",
      "6087"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "137204.safetensors",
    "name": "Experience",
    "id": "5952",
    "shortName": "Experience",
    "link": "https://civitai.com/models/5952",
    "baseModel": "SD 1.5",
    "aliases": [
      "70",
      "5952",
      "137204"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "13510.safetensors",
    "name": "SunshineMix＆SunlightMix",
    "id": "9291",
    "shortName": "SunshineMix＆SunlightMix",
    "link": "https://civitai.com/models/9291",
    "baseModel": "SD 1.5",
    "aliases": [
      "71",
      "9291",
      "13510"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "158294.safetensors",
    "name": "Sweet-mix",
    "id": "18927",
    "shortName": "Sweet-mix",
    "link": "https://civitai.com/models/18927",
    "baseModel": "SD 1.5",
    "aliases": [
      "72",
      "18927",
      "158294"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "162380.safetensors",
    "name": "[Lah] Mysterious | SDXL",
    "id": "118441",
    "shortName": "[Lah] Mysterious | SDXL",
    "link": "https://civitai.com/models/118441",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "73",
      "118441",
      "162380"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "25993.safetensors",
    "name": "FaceBombMix",
    "id": "7152",
    "shortName": "FaceBombMix",
    "link": "https://civitai.com/models/7152",
    "baseModel": "SD 1.5",
    "aliases": [
      "74",
      "7152",
      "25993"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "133274.safetensors",
    "name": "SakushiMix (finished)",
    "id": "78056",
    "shortName": "SakushiMix (finished)",
    "link": "https://civitai.com/models/78056",
    "baseModel": "SD 1.5",
    "aliases": [
      "75",
      "78056",
      "133274"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "147184.safetensors",
    "name": "Meichidark_Mix",
    "id": "69158",
    "shortName": "Meichidark_Mix",
    "link": "https://civitai.com/models/69158",
    "baseModel": "SD 1.5",
    "aliases": [
      "76",
      "69158",
      "147184"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "136754.safetensors",
    "name": "DucHaiten-AIart-SDXL",
    "id": "118756",
    "shortName": "DucHaiten-AIart-SDXL",
    "link": "https://civitai.com/models/118756",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "77",
      "118756",
      "136754"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "106169.safetensors",
    "name": "Galena REDUX",
    "id": "53360",
    "shortName": "Galena REDUX",
    "link": "https://civitai.com/models/53360",
    "baseModel": "SD 1.5",
    "aliases": [
      "78",
      "53360",
      "106169"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "156883.safetensors",
    "name": "YiffyMix",
    "id": "3671",
    "shortName": "YiffyMix",
    "link": "https://civitai.com/models/3671",
    "baseModel": "SD 1.5",
    "aliases": [
      "79",
      "3671",
      "156883"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "124626.safetensors",
    "name": "RPG",
    "id": "1116",
    "shortName": "RPG",
    "link": "https://civitai.com/models/1116",
    "baseModel": "SD 1.5",
    "aliases": [
      "80",
      "1116",
      "124626"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "6878.safetensors",
    "name": "Corneo's 7th Heaven Mix",
    "id": "4669",
    "shortName": "Corneo's 7th Heaven Mix",
    "link": "https://civitai.com/models/4669",
    "baseModel": "SD 1.5",
    "aliases": [
      "81",
      "4669",
      "6878"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "15640.safetensors",
    "name": "Uber Realistic Porn Merge (URPM) [LEGACY Version]",
    "id": "2661",
    "shortName": "Uber Realistic Porn Merge (URPM) [LEGACY Version]",
    "link": "https://civitai.com/models/2661",
    "baseModel": "SD 1.5",
    "aliases": [
      "82",
      "2661",
      "15640"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "103436.safetensors",
    "name": "Flat-2D Animerge",
    "id": "35960",
    "shortName": "Flat-2D Animerge",
    "link": "https://civitai.com/models/35960",
    "baseModel": "SD 1.5",
    "aliases": [
      "83",
      "35960",
      "103436"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "111564.safetensors",
    "name": "Animesh",
    "id": "90642",
    "shortName": "Animesh",
    "link": "https://civitai.com/models/90642",
    "baseModel": "Other",
    "aliases": [
      "84",
      "90642",
      "111564"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "105566.safetensors",
    "name": "Sardonyx REDUX",
    "id": "52548",
    "shortName": "Sardonyx REDUX",
    "link": "https://civitai.com/models/52548",
    "baseModel": "SD 1.5",
    "aliases": [
      "85",
      "52548",
      "105566"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "161244.safetensors",
    "name": "RealCartoon-Realistic",
    "id": "97744",
    "shortName": "RealCartoon-Realistic",
    "link": "https://civitai.com/models/97744",
    "baseModel": "SD 1.5",
    "aliases": [
      "86",
      "97744",
      "161244"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "129240.safetensors",
    "name": "fantasticmix",
    "id": "22402",
    "shortName": "fantasticmix",
    "link": "https://civitai.com/models/22402",
    "baseModel": "SD 1.5",
    "aliases": [
      "87",
      "22402",
      "129240"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "107847.safetensors",
    "name": "Arthemy Comics",
    "id": "54073",
    "shortName": "Arthemy Comics",
    "link": "https://civitai.com/models/54073",
    "baseModel": "SD 1.5",
    "aliases": [
      "88",
      "54073",
      "107847"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "148259.safetensors",
    "name": "DynaVision XL - All-in-one stylized 3D SFW and NSFW output, no refiner needed!",
    "id": "122606",
    "shortName": "DynaVision XL - All-in-one stylized 3D SFW and NSFW output, no refiner needed!",
    "link": "https://civitai.com/models/122606",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "89",
      "122606",
      "148259"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "18295.safetensors",
    "name": "AOAOKO [PVC Style Model]",
    "id": "15509",
    "shortName": "AOAOKO [PVC Style Model]",
    "link": "https://civitai.com/models/15509",
    "baseModel": "SD 1.4",
    "aliases": [
      "90",
      "15509",
      "18295"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "107675.safetensors",
    "name": "Noosphere",
    "id": "36538",
    "shortName": "Noosphere",
    "link": "https://civitai.com/models/36538",
    "baseModel": "SD 1.5",
    "aliases": [
      "91",
      "36538",
      "107675"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "155994.safetensors",
    "name": "Virile Reality",
    "id": "82790",
    "shortName": "Virile Reality",
    "link": "https://civitai.com/models/82790",
    "baseModel": "SD 1.5",
    "aliases": [
      "92",
      "82790",
      "155994"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "8137.safetensors",
    "name": "RealDosMix",
    "id": "6925",
    "shortName": "RealDosMix",
    "link": "https://civitai.com/models/6925",
    "baseModel": "SD 1.5",
    "aliases": [
      "93",
      "6925",
      "8137"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "155870.safetensors",
    "name": "SDVN7-NijiStyleXL",
    "id": "123307",
    "shortName": "SDVN7-NijiStyleXL",
    "link": "https://civitai.com/models/123307",
    "baseModel": "SDXL 1.0",
    "aliases": [
      "94",
      "123307",
      "155870"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "5036.safetensors",
    "name": "AbyssOrangeMix2 - NSFW",
    "id": "4449",
    "shortName": "AbyssOrangeMix2 - NSFW",
    "link": "https://civitai.com/models/4449",
    "baseModel": "SD 1.5",
    "aliases": [
      "95",
      "4449",
      "5036"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "156882.safetensors",
    "name": "AingDiffusion",
    "id": "34553",
    "shortName": "AingDiffusion",
    "link": "https://civitai.com/models/34553",
    "baseModel": "SD 1.5",
    "aliases": [
      "96",
      "34553",
      "156882"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "41233.safetensors",
    "name": "AnyHentai",
    "id": "5706",
    "shortName": "AnyHentai",
    "link": "https://civitai.com/models/5706",
    "baseModel": "SD 1.5",
    "aliases": [
      "97",
      "5706",
      "41233"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "125771.safetensors",
    "name": "ToonYou",
    "id": "30240",
    "shortName": "ToonYou",
    "link": "https://civitai.com/models/30240",
    "baseModel": "SD 1.5",
    "aliases": [
      "98",
      "30240",
      "125771"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "87825.safetensors",
    "name": "Kizuki - Anime / Hentai Checkpoint",
    "id": "22364",
    "shortName": "Kizuki - Anime / Hentai Checkpoint",
    "link": "https://civitai.com/models/22364",
    "baseModel": "SD 1.5",
    "aliases": [
      "99",
      "22364",
      "87825"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "7328.safetensors",
    "name": "DosMix",
    "id": "6250",
    "shortName": "DosMix",
    "link": "https://civitai.com/models/6250",
    "baseModel": "SD 1.5",
    "aliases": [
      "100",
      "6250",
      "7328"
    ],
    "defaultPrompt": "a young woman, street, laughing, ponytails, dramatic, complex background, cinematic"
  },
  {
    "path": "animePastelDream_softBakedVae.safetensors",
    "name": "Anime Pastel Dream",
    "id": "23521",
    "hash": "4BE38C1A17",
    "shortName": "anime-pastel-dream",
    "link": "https://civitai.com/models/23521/anime-pastel-dream",
    "baseModel": "SD 1.5",
    "aliases": [
      "101",
      "n",
      "an",
      "anime",
      "2352",
      "h4be"
    ],
    "defaultPrompt": "masterpiece, best quality, ultra-detailed, illustration, beautiful detailed eyes, looking at viewer, close up, pink hair, shy, cat ears"
  },
  {
    "path": "v1-5-pruned-emaonly.safetensors",
    "name": "v1-5-pruned-emaonly",
    "id": "",
    "hash": "",
    "shortName": "pruned-emaonly",
    "link": "",
    "baseModel": "SD 1.5",
    "aliases": [
      "102",
      "p",
      "prune"
    ],
    "defaultPrompt": "masterpiece, best quality, ultra-detailed, illustration, beautiful detailed eyes, looking at viewer, close up, pink hair, shy, cat ears"
  }
]

export const getModelByParam = (param: string) => {
  const model = MODELS_CONFIGS.find(m =>
    m.id === param ||
    (m.hash && m.hash === param) ||
    m.shortName === param ||
    m.aliases.includes(param)
  )

  return model
}

export const modelsAliases = []