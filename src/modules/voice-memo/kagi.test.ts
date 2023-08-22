import { Kagi } from './kagi';
import axios from 'axios';
import {describe, expect, it, afterEach, jest} from '@jest/globals'


// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Kagi class', () => {
  const apiKey = 'testApiKey';
  const kagi = new Kagi(apiKey);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummarization', () => {
    it('should send request to Kagi with correct URL and headers', async () => {
      const mockResponse = {
        data: {
          meta: {},
          data: {
            output: 'test output',
          },
          tokens: 0,
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const audioUrl = 'testAudioUrl';
      await kagi.getSummarization(audioUrl);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://kagi.com/api/v0/summarize?url=${audioUrl}`,
        {
          headers: {
            'Authorization': `Bot ${apiKey}`
          }
        }
      );
    });

    it('should return the output from the Kagi API', async () => {
      const mockOutput = 'test output';
      const mockResponse = {
        data: {
          meta: {},
          data: {
            output: mockOutput,
          },
          tokens: 0,
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await kagi.getSummarization('testAudioUrl');
      expect(result).toEqual(mockOutput);
    });
  });

  describe('estimatePrice', () => {
    it('should correctly estimate the price based on duration', () => {
      const duration = 7200; // 2 hours in seconds
      const estimatedPrice = kagi.estimatePrice(duration);
      expect(estimatedPrice).toEqual(1); // 0.5 * 2 = 1
    });
  });
});
