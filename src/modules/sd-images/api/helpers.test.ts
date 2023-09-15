/* eslint-disable */
import { waitingExecute, IParams, getParamsFromPrompt } from './helpers'
import { type IModel } from './models-config'

// Mock the console.error method to prevent it from actually logging errors
console.error = jest.fn()

describe('waitingExecute', () => {
  test('waits for the promise to resolve', async () => {
    const promise = Promise.resolve('Success')
    const result = await waitingExecute(async () => await promise, 1000)
    expect(result).toBe('Success')
  })

  test('rejects the promise when timeout is reached', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => { resolve('Success') }, 2000)
    })

    try {
      await waitingExecute(async () => await promise, 1000)
    } catch (error) {
      expect(error).toBe('Error: waitingExecute time is up')
    }
  })
})

describe('getParamsFromPrompt', () => {
  test('parses parameters from the prompt', () => {
    const prompt = 'doo, moo, boo --ar 16:9 --d 1280x720 --cfg 5.0 --steps 50 --c 2 --seed 1234567890 --denoise 0.5 --no cats, dogs, llamas <lora:foo:0.75>'
    const model = { baseModel: 'SDXL 1.0' } as IModel
    const params = getParamsFromPrompt(prompt, model)

    expect(params).toEqual({
      negativePrompt: 'cats, dogs, llamas',
      width: 1280,
      height: 720,
      steps: 50,
      cfgScale: 5.0,
      loraStrength: 0.75,
      loraName: 'foo',
      promptWithoutParams: 'doo, moo, boo',
      seed: 1234567890,
      denoise: 0.5,
      controlnetVersion: 2
    })
  })

  test('handles missing parameters with default values', () => {
    const prompt = 'This is a prompt without parameters'
    const model = { baseModel: 'SDXL 1.0' } as IModel
    const params = getParamsFromPrompt(prompt, model)

    expect(params).toEqual({
      negativePrompt: '(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation',
      width: 1024,
      height: 1024,
      steps: 26,
      cfgScale: 7.0,
      loraStrength: undefined,
      loraName: undefined,
      promptWithoutParams: 'This is a prompt without parameters',
      seed: undefined,
      denoise: undefined,
      controlnetVersion: 1
    })
  })
})
