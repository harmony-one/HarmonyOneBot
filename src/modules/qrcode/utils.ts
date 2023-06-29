import * as QRCode from "qrcode";
import * as png from "upng-js";
import readQR from "./paulmillr_qr/decode";

interface Params {
  url: string,
  margin?: number,
  width?: number
}

function normalizeUrl(url: string) {

  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('http')) {
      parsedUrl.protocol = 'https:';
    }
    return parsedUrl.href;
  } catch (error) {
    // Handle invalid URL
    console.error('Invalid URL:', url);
    return url;
  }
}

export const createQRCode = ({url, margin = 0, width = 512}: Params): Promise<Buffer> => {
  return QRCode.toBuffer(normalizeUrl(url), {margin: margin, width: width, type: "png", errorCorrectionLevel: "high" })
}

export async function retryAsync<T>(
  fn: (r: number) => Promise<T>,
  retries: number,
  delayMs: number
): Promise<T> {
  try {
    return await fn(retries);
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return retryAsync(fn, retries - 1, delayMs);
    } else {
      throw error;
    }
  }
}

export const scanQRCode = (imgBuffer: Buffer) => {
  const pngData = png.decode(imgBuffer);

  const out = {
    data: new Uint8ClampedArray(png.toRGBA8(pngData)[0]),
    height: pngData.height,
    width: pngData.width,
  };

  return readQR({ height: pngData.height, width: pngData.width, data: out.data });
}

export const isQRCodeReadable = (imgBuffer: Buffer) => {
  const info = scanQRCode(imgBuffer);
  return !!info;
}