export const automatic1111DefaultConfig = {
  // It will be added to the user's prompt
  additionalPrompt: '(masterpiece), (best quality), (ultra-detailed), hires',
  defaultNegativePrompt: '(KHFB, AuroraNegative),(Worst Quality, Low Quality:1.4), ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, extra limbs, disfigured, deformed, body out of frame, bad anatomy, watermark, signature, cut off, low contrast, underexposed, overexposed, bad art, beginner, amateur, distorted face, blurry, draft, grainy',
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
