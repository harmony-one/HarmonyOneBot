export const getPercentDiff = function(v1: number, v2: number) {
  if(v1 === 0) {
    return 0
  }
  return ((v2 - v1) / Math.abs(v1)) * 100
}
