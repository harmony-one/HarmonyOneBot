import config from '../../../config'

export const buildTxUri = (txHash: string): string => {
  return config.country.explorer.tx + txHash
}
export const buildERC1155Uri = (
  contractAddress: string,
  tokenId: string | number
): string => {
  return `${config.country.explorer.erc1155}${contractAddress}/${tokenId}`
}
