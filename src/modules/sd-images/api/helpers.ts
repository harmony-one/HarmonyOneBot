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
}

export const NEGATIVE_PROMPT = '(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation';

export const getParamsFromPrompt = (originalPrompt: string, model: IModel): IParams => {
  let prompt = originalPrompt;

  // --ar Aspect ratio flag <w>:<h>
  const aspectRatioMatch = prompt.match(/--ar\s+(\d+:\d+)/);
  let width = model.baseModel === 'SDXL 1.0' ? 1024 : 512;
  let height = model.baseModel === 'SDXL 1.0' ? 1024 : 768;

  if (aspectRatioMatch) {
    const aspectRatio = aspectRatioMatch[1];
    const [aspectWidth, aspectHeight] = aspectRatio.split(':').map(Number);

    if (!isNaN(aspectWidth) && !isNaN(aspectHeight) && aspectHeight !== 0) {
      const scaleFactor = width / aspectWidth;
      height = Math.round(aspectHeight * scaleFactor);
    }

    prompt = prompt.replace(/--ar\s+(\d+:\d+)/, '');
  }

  // --d Dimensions flag <w>x<h>
  const dimensionsMatch = prompt.match(/--d\s+(\d+x\d+)/);

  if (dimensionsMatch) {
    const dimensions = dimensionsMatch[1];

    [width, height] = dimensions.split('x').map(Number);

    prompt = prompt.replace(/--d\s+(\d+x\d+)/, '');
  }

  // --cfg cfgScale flag <scale>
  const cfgScaleMatch = prompt.match(/--cfg\s+(\d+(\.\d+)?)/);
  let cfgScale = 7.0;

  if (cfgScaleMatch) {
    cfgScale = parseFloat(cfgScaleMatch[1]);

    prompt = prompt.replace(/--cfg\s+(\d+(\.\d+)?)/, '');
  }

  // --steps Steps flag <steps>
  const stepsMatch = prompt.match(/--steps\s+(\d+)/);
  let steps = 26;

  if (stepsMatch) {
    steps = parseInt(stepsMatch[1]);

    prompt = prompt.replace(/--steps\s+(\d+)/, '');
  }

  // --c Controlnet flag <steps>
  const controlnetVersionMatch = prompt.match(/--c\s+(\d+)/);
  let controlnetVersion = 1;

  if (controlnetVersionMatch) {
    controlnetVersion = parseInt(controlnetVersionMatch[1]);

    prompt = prompt.replace(/--c\s+(\d+)/, '');
  }

  let seed;

  // --seed cfgScale flag <seed>
  const seedMatch = prompt.match(/--seed\s+(\d+)/);

  if (seedMatch) {
    seed = parseInt(seedMatch[1]);

    prompt = prompt.replace(/--seed\s+(\d+)/, '');
  }

  let denoise;

  // --seed cfgScale flag <seed>
  const denoiseMatch = prompt.match(/--denoise\s+(\d+\.\d+)/);

  if (denoiseMatch) {
    denoise = Number(denoiseMatch[1]);

    prompt = prompt.replace(/--denoise\s+(\d+\.\d+)/, '');
  }

  // --no Negative prompt flag <negative_prompts>
  const noMatch = prompt.match(/--no\s+(.+?)(?=\s+--|$)/);
  let negativePrompt = NEGATIVE_PROMPT;

  if (noMatch) {
    negativePrompt = noMatch[1].trim();
    prompt = prompt.replace(/--no\s+(.+?)(?=\s+--|$)/, '');
  }

  const loraMatch = prompt.match(/<lora:(.*):(.*)>/);
  let loraStrength;
  let loraName;

  if (loraMatch) {
    loraName = loraMatch[1];
    loraStrength = Number(loraMatch[2]);
    
    prompt = prompt.replace(/<lora:(.*):(.*)>/, '');
  }

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
    controlnetVersion
  }
}