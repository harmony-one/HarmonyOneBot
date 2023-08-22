import { Speechmatics } from './speechmatics';
import {describe, expect, it, beforeEach, jest} from '@jest/globals'
import axios from 'axios';

jest.mock('axios');

describe('Speechmatics', () => {
    const mockApiKey = 'mockApiKey';
    let instance: Speechmatics;
  
    beforeEach(() => {
      instance = new Speechmatics(mockApiKey);
    });
  
    describe('getTranslation', () => {
      it('should successfully get translation for a file', async () => {
        const mockDataUrl = 'mockDataUrl';
        const mockJobId = 'mockJobId';
  
        (axios.post as jest.MockedFunction<typeof axios.post>).mockResolvedValueOnce({ data: { id: mockJobId } });
        (axios.get as jest.MockedFunction<typeof axios.get>)
          .mockResolvedValueOnce({ data: 'mockTranslation' })
          .mockResolvedValueOnce({ data: { summary: { content: 'mockSummary' } } });
  
        const result = await instance.getTranslation(mockDataUrl);
  
        expect(result).toEqual({
          translation: 'mockTranslation > undefined',
          summarization: 'mockSummary'
        });
      });
  
      it('should enrich the translation correctly', async () => {
        const mockDataUrl = 'mockDataUrl';
        const mockJobId = 'mockJobId';
  
        (axios.post as jest.MockedFunction<typeof axios.post>).mockResolvedValueOnce({ data: { id: mockJobId } });
        (axios.get as jest.MockedFunction<typeof axios.get>)
          .mockResolvedValueOnce({ data: 'SPEAKER: S1\nmockText1\n\nSPEAKER: S2\nmockText2' })
          .mockResolvedValueOnce({ data: { summary: { content: 'mockSummary' } } });
  
        const result = await instance.getTranslation(mockDataUrl);
  
        expect(result?.translation).toBe('1 > mockText1\n\n2 > mockText2');
      });
    });
  
    describe('postJob', () => {
      it('should successfully post a job with a file', async () => {
        const mockDataUrl = 'mockDataUrl';
  
        (axios.post as jest.MockedFunction<typeof axios.post>).mockResolvedValueOnce({ data: { id: 'mockJobId' } });
  
        // You'll have to access the private method using "any" for the sake of testing
        const jobId = await (instance as any).postJob(mockDataUrl, 'file');
  
        expect(jobId).toBe('mockJobId');
      });
  
      it('should successfully post a job with a URL', async () => {
        const mockDataUrl = 'http://example.com';
  
        (axios.post as jest.MockedFunction<typeof axios.post>).mockResolvedValueOnce({ data: { id: 'mockJobId' } });
  
        const jobId = await (instance as any).postJob(mockDataUrl, 'url');
  
        expect(jobId).toBe('mockJobId');
      });
    });
  
    describe('estimatePrice', () => {
      it('should calculate the price correctly', () => {
        const mockDuration = 3600; // 1 hour
        const expectedResult = 200; // 2 USD per hour
  
        const result = instance.estimatePrice(mockDuration);
        
        expect(result).toBe(expectedResult);
      });
    });
  
    // Similarly, you can add tests for getJobResult, getJobSummarization, and pollJobResult
    
  });