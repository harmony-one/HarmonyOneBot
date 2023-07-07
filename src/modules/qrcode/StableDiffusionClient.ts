import axios from "axios";
import config from "../../config";
import {getImg2ImgConfig, getTxt2ImgConfig, SDConfig} from "./stableDiffusionConfigs";

type Img2ImgResponse = {
  images: string[]
  parameters: object
  info: string
}

const sdHttpClient = axios.create({baseURL: config.stableDiffusionHost, headers: {'Content-Type': 'application/json'}});

export class StableDiffusionClient {
  async img2img(config: SDConfig) {
    const body = getImg2ImgConfig(config)

    try {
      const response = await sdHttpClient.post(`/sdapi/v1/img2img`, body);
      const data: Img2ImgResponse = response.data;
      const img = data.images[0]

      return Buffer.from(img, 'base64')
    } catch (ex) {
      console.log('### ex', ex);
      // @ts-expect-error
      console.log('### ex', JSON.stringify(ex.response.data));
    }
  }

  async text2img(config: SDConfig) {
    // const filePath = path.join(__dirname, '../../files/qrcodes/h_country.png');
    // const imgBase64 = fs.readFileSync(filePath, 'base64')

    const body = getTxt2ImgConfig(config)

    try {
      const response = await sdHttpClient.post(`/sdapi/v1/txt2img`, body);
      const data: Img2ImgResponse = response.data;
      const img = data.images[0];
      return Buffer.from(img, 'base64')
    } catch (ex) {
      console.log('### ex', ex);
      // @ts-expect-error
      console.log('### ex', JSON.stringify(ex.response.data));
    }
  }
}