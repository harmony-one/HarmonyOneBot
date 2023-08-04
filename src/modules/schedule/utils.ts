export const getPercentDiff = function(a: number, b: number) {
  const diff = a - b
  return diff / b * 100
}
