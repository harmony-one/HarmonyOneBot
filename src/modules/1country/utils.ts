import config from "../../config";

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
