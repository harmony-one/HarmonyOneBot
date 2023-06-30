import { randomBytes } from 'crypto'

export const uuidv4 = () => {
  return [randomBytes(4), randomBytes(4), randomBytes(4), randomBytes(4)].join('-');
};

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));