import * as QRCode from 'qrcode'
import * as png from 'upng-js'
import readQR from './paulmillr_qr/decode'

interface Params {
  url: string
  margin?: number
  width?: number
}

export function normalizeUrl (url: string): string {
  if (!url.startsWith('http')) {
    url = 'https://' + url
  }

  try {
    const parsedUrl = new URL(url)
    if (!parsedUrl.protocol.startsWith('http')) {
      parsedUrl.protocol = 'https:'
    }
    return parsedUrl.href
  } catch (error) {
    // Handle invalid URL
    console.error('Invalid URL:', url)
    return url
  }
}

export const createQRCode = async ({ url, margin = 0, width = 512 }: Params): Promise<Buffer> => {
  return await QRCode.toBuffer(url, { margin, width, type: 'png', errorCorrectionLevel: 'high' })
}

export async function retryAsync<T> (
  fn: (r: number) => Promise<T>,
  retries: number,
  delayMs: number
): Promise<T> {
  try {
    return await fn(retries)
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      return await retryAsync(fn, retries - 1, delayMs)
    } else {
      throw error
    }
  }
}

export const scanQRCode = (imgBuffer: Buffer): string => {
  const pngData = png.decode(imgBuffer)

  const out = {
    data: new Uint8ClampedArray(png.toRGBA8(pngData)[0]),
    height: pngData.height,
    width: pngData.width
  }

  return readQR({ height: pngData.height, width: pngData.width, data: out.data })
}

export const isQRCodeReadable = (imgBuffer: Buffer): boolean => {
  const info = scanQRCode(imgBuffer)
  return !!info
}
