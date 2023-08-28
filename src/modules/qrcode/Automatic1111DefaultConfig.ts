import {PROMPTS} from "../../constants";

export const automatic1111DefaultConfig = {
  // It will be added to the user's prompt
  additionalPrompt: '(masterpiece), (best quality), (ultra-detailed), hires',
  defaultNegativePrompt: PROMPTS.qrNegativePrompt,
  img2img: {
    steps: 60,
    guidanceStart: 0.17,
    guidanceEnd: 0.7,
    width: 610,
    height: 610,
  },
  text2img: {
    steps: 40,
    guidanceStart: 0.02,
    guidanceEnd: 0.9,
    width: 610,
    height: 610,
  }
}
