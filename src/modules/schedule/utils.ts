export const getPercentDiff = function(v1: number, v2: number) {
  if(v1 === 0) {
    return 0
  }
  return ((v2 - v1) / Math.abs(v1)) * 100
}

export const abbreviateNumber = (value: number) => {
  if (Math.abs(value) < 1) {
    return value.toFixed(3)
  }

  let fractionalDigits = 0
  const length = (Math.abs(value) + '').length,
    index = Math.ceil((length - 3) / 3),
    suffix = ['k', 'm', 'b', 't', 'q', 'q'];

  if(Math.abs(value) < 100 || length % 3 === 0) { // exception for values < 100, no decimal part
    fractionalDigits = 0
  } else if(length % 3 === 1) {
    fractionalDigits = 2
  } else if(length % 3 === 2) {
    fractionalDigits = 1
  }

  if (length < 4) { // < 1000
    return value.toFixed(fractionalDigits)
  }

  return (+value / Math.pow(1000, index))
    .toFixed(fractionalDigits)
    .replace(/\.0$/, '') + suffix[index - 1];
}
