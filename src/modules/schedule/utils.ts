export const getPercentDiff = function(a: number, b: number) {
  return  ( a<b ? ((b - a) * 100) / a : ((a - b) * 100) / b );
}
