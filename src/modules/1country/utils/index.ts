import config from "../../../config";

export const formatONEAmount = (num: number | string) => {
  const twoDecimalsFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    //@ts-ignore
    maximumFractionDigits: num < 1 ? 2 : 0,
  });

  return twoDecimalsFormatter.format(Number(num));
};

export const formatUSDAmount = (num: string | number) => {
  const twoDecimalsFormatter = new Intl.NumberFormat("en-US", {
    //@ts-ignore
    minimumFractionDigits: num < 10 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return twoDecimalsFormatter.format(Number(num));
};

export const getUrl = (url: string, fullUrl = true) => {
  if (url.endsWith("/")) {
    url = url.slice(0, url.length - 1);
  }
  if (url.startsWith("https://")) {
    url = url.slice("https://".length);
  }
  return !url.includes(".country") && fullUrl
    ? url.concat(config.country.tld)
    : url;
};
