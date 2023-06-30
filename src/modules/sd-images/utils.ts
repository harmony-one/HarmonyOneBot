import { randomBytes } from 'crypto'

const rand = () => randomBytes(4).toString('hex');

export const uuidv4 = () => {
  return [1, 2, 3, 4].map(() => rand()).join('-');
};

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));