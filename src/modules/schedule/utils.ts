export const getPercentDiff = function(a: number, b: number) {
  if(b === 0) {
    return 0
  }
  const diff = a - b
  return diff / b * 100
}
