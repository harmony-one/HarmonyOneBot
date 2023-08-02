import axios from 'axios'
import FormData from 'form-data';
import * as fs from "fs";

export interface SpeechmaticsResult {
  translation: string
  summarization: string
}

export class Speechmatics {
  private readonly apiKey: string
  private readonly pricePerHour = 2 // USD

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async postJob (dataUrl: string, type: 'file' | 'url') {
    const formData = new FormData()

    let config: any = {
      "type": "transcription",
      "transcription_config": {
        "operating_point": "enhanced", // enhanced standard
        "language": "en",
        "enable_entities": true,
        "diarization": "speaker",
      },
      "summarization_config": {
        "content_type": "conversational",
        "summary_length": "brief",
        "summary_type": "paragraphs"
      }
    }

    if(type === 'url') {
      config = {
        ...config,
        "fetch_data": {
          "url": dataUrl
        },
      }
    } else {
      formData.append('data_file', fs.createReadStream(dataUrl))
    }

    formData.append('config', JSON.stringify(config))

    const { data } = await axios.post<{ id: string }>('https://asr.api.speechmatics.com/v2/jobs/', formData, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        "Content-Type": "multipart/form-data",
      }
    })
    return data.id
  }

  private sleep = (timeout: number) => {
    return new Promise(resolve => setTimeout(resolve, timeout))
  }

  private async getJobResult (jobId: string) {
    const { data } = await axios.get(`https://asr.api.speechmatics.com/v2/jobs/${jobId}/transcript?format=txt`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })
    return data
  }

  private async getJobSummarization (jobId: string): Promise<string> {
    const { data } = await axios.get(`https://asr.api.speechmatics.com/v2/jobs/${jobId}/transcript?format=json-v2`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })
    return data && data.summary && data.summary.content ? data.summary.content:  ''
  }

  private async pollJobResult (jobId: string): Promise<SpeechmaticsResult | null> {
    for(let i = 0; i < 30 * 60; i++) {
      try {
        const translation = await this.getJobResult(jobId)
        const summarization = await this.getJobSummarization(jobId)
        return {
          translation,
          summarization
        }
      } catch (e) {}
      finally {
        await this.sleep(1000)
      }
    }
    return null
  }

  public async getTranslation (dataUrl: string, type: 'file' | 'url' = 'file') {
    const jobIb = await this.postJob(dataUrl, type)
    console.log(`Speechmatics: start job ${jobIb}, data url: ${dataUrl}`)
    const result = await this.pollJobResult(jobIb)
    return result
  }

  public estimatePrice (duration: number) {
    return Math.ceil(this.pricePerHour * duration / 60 / 60 * 100)
  }
}
