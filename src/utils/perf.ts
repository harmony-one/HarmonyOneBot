// return high-res time in microseconds
export function now (): bigint {
  return BigInt(Math.round((performance.now() + performance.timeOrigin) * 1000))
}
