import { IModel } from "./models-config";

export const waitingExecute = (fn: () => Promise<any>, ms: number) => new Promise((resolve, reject) => {
  const timeoutId = setTimeout(() => {
    console.error('SD images Error: waitingExecute time is up');
    reject('Error: waitingExecute time is up');
  }, ms);

  fn().then(resolve).catch(reject).finally(() => clearTimeout(timeoutId))
});

export interface IParams {
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  loraStrength?: number;
  loraName?: string;
  promptWithoutParams: string;
  seed?: number;
  denoise?: number;
  controlnetVersion: number;
  sampler_name?: string;
  scheduler?: string;
}

export const NEGATIVE_PROMPT = '(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation';

export const getParamsFromPrompt = (originalPrompt: string, model: IModel): IParams => {
  let prompt = originalPrompt;

  // Civit generation data
  if (prompt.includes("Negative prompt:")) {
    let param_blob = prompt.split("Negative prompt: ")[1] || '';
    let c_prompt = prompt.split("Negative prompt: ")[0].trim() || '';
    let c_negativePrompt = param_blob.split("Steps: ")[0].trim() || '';
    let step_match = param_blob.match(/Steps:\s+(\d+)/);
    let c_steps = step_match ? step_match[1] : '20';
    let dim_match = param_blob.match(/Size:\s+(\d+x\d+)/);
    let c_dimensions = dim_match ? dim_match[1] : '512x512';
    let cfg_match = param_blob.match(/CFG scale:\s+(\d+(\.\d+)?)/);
    let c_cfg = cfg_match ? cfg_match[1] : '7';
    let seed_match = param_blob.match(/Seed:\s+(\d+)/);
    let c_seed = seed_match ? seed_match[1] : '1234567890';

    let sampler_match = param_blob.match(/Sampler:\s(.*?),\s/);
    let sampler_full = sampler_match ? sampler_match[1] : 'dpmpp_2m karras';
    sampler_full = sampler_full.toLowerCase();
    sampler_full = sampler_full.replaceAll("+", "p");
    let c_sampler = 'dpmpp_2m'
    let c_scheduler = 'karras'
    if (sampler_full.includes("karras")) {
      c_scheduler = 'karras'
      sampler_full = sampler_full.replaceAll(" karras", '');
      c_sampler = sampler_full.replaceAll(" ", '_')
    } else {
      c_scheduler = 'normal'
      c_sampler = sampler_full
    }


    prompt = c_prompt + ' --no ' + c_negativePrompt + ' --steps ' + c_steps + ' --d ' + c_dimensions + ' --cfg ' + c_cfg + ' --seed ' + c_seed + ' --sampler ' + c_sampler + ' --scheduler ' + c_scheduler;
  }

  // lora match
  const loraMatch = prompt.match(/<lora:(.*):(.*)>/);
  let loraStrength;
  let loraName;

  if (loraMatch) {
    loraName = loraMatch[1];
    loraStrength = Number(loraMatch[2]);
    
    // prompt = prompt.replace(/<lora:(.*):(.*)>/, '');
  }

  // --ar Aspect ratio flag <w>:<h>
  const aspectRatioMatch = prompt.match(/(--|\—)ar\s+(\d+:\d+)/);

  let width = model.baseModel === 'SDXL 1.0' ? 1024 : 512;
  let height = model.baseModel === 'SDXL 1.0' ? 1024 : 768;

  if (aspectRatioMatch) {
    const aspectRatio = aspectRatioMatch[2];
    const [aspectWidth, aspectHeight] = aspectRatio.split(':').map(Number);

    if (!isNaN(aspectWidth) && !isNaN(aspectHeight) && aspectHeight !== 0) {
      const scaleFactor = width / aspectWidth;
      height = Math.round(aspectHeight * scaleFactor);
    }

    prompt = prompt.replace(/(--|\—)ar\s+(\d+:\d+)/, '');
  }

  // --d Dimensions flag <w>x<h>
  const dimensionsMatch = prompt.match(/(--|\—)d\s+(\d+x\d+)/);

  if (dimensionsMatch) {
    const dimensions = dimensionsMatch[2];

    [width, height] = dimensions.split('x').map(Number);

    prompt = prompt.replace(/(--|\—)d\s+(\d+x\d+)/, '');
  }

  // --cfg cfgScale flag <scale>
  const cfgScaleMatch = prompt.match(/(--|\—)cfg\s+(\d+(\.\d+)?)/);
  let cfgScale = 7.0;

  if (cfgScaleMatch) {
    cfgScale = parseFloat(cfgScaleMatch[2]);

    prompt = prompt.replace(/(--|\—)cfg\s+(\d+(\.\d+)?)/, '');
  }

  // --steps Steps flag <steps>
  const stepsMatch = prompt.match(/(--|\—)steps\s+(\d+)/);
  let steps = 26;

  if (stepsMatch) {
    steps = parseInt(stepsMatch[2]);

    prompt = prompt.replace(/(--|\—)steps\s+(\d+)/, '');
  }

  // --c Controlnet version flag <control_net_version>
  const controlnetVersionMatch = prompt.match(/(--|\—)c\s+(\d+)/);
  let controlnetVersion = 1;

  if (controlnetVersionMatch) {
    controlnetVersion = parseInt(controlnetVersionMatch[2]);

    prompt = prompt.replace(/(--|\—)c\s+(\d+)/, '');
  }

  let seed;

  // --seed cfgScale flag <seed>
  const seedMatch = prompt.match(/(--|\—)seed\s+(\d+)/);

  if (seedMatch) {
    seed = parseInt(seedMatch[2]);

    prompt = prompt.replace(/(--|\—)seed\s+(\d+)/, '');
  }

  let denoise;

  // --denoise Denoise scale flag <denoise>
  const denoiseMatch = prompt.match(/(--|\—)denoise\s+(\d+\.\d+)/);

  if (denoiseMatch) {
    denoise = Number(denoiseMatch[2]);

    prompt = prompt.replace(/(--|\—)denoise\s+(\d+\.\d+)/, '');
  }

  // --no Negative prompt flag <negative_prompts>
  const noMatch = prompt.match(/(--|\—)no\s+(.+?)(?=\s+--|$)/);
  let negativePrompt = NEGATIVE_PROMPT;

  if (noMatch) {
    negativePrompt = noMatch[2].trim();
    prompt = prompt.replace(/(--|\—)no\s+(.+?)(?=\s+--|$)/, '');
  }

  // --sampler Sampler name flag <sampler_name>
  const samplerMatch = prompt.match(/(--|\—)sampler\s+(\w+)/);
  let sampler_name = 'dpmpp_2m';

  if (samplerMatch) {
    sampler_name = samplerMatch[2].trim();
    prompt = prompt.replace(/(--|\—)sampler\s+(\w+)/, '');
  }

  // --scheduler Scheduler name flag <scheduler_name>
  const schedulerMatch = prompt.match(/(--|\—)scheduler\s+(\w+)/);
  let scheduler = 'karras';

  if (schedulerMatch) {
    scheduler = schedulerMatch[2].trim();
    prompt = prompt.replace(/(--|\—)scheduler\s+(\w+)/, '');
  }

  // Add 'leogirl' to trigger /leo model
  if (model.name == 'leosams_helloworld' && !prompt.includes('leogirl')) {
    prompt = 'leogirl ' + prompt
  }

  prompt = prompt.trim()

  return {
    negativePrompt,
    width,
    height,
    steps,
    cfgScale,
    loraStrength,
    loraName,
    promptWithoutParams: prompt,
    seed,
    denoise,
    controlnetVersion,
    sampler_name,
    scheduler,
  }
}