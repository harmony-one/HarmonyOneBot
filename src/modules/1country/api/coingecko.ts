import axios from "axios";
import { formatONEAmount, formatUSDAmount } from "../utils";

const base = axios.create({
  baseURL:
    "https://api.coingecko.com/api/v3/simple/price?ids=harmony&vs_currencies=usd",
  timeout: 10000,
});

export const getUSDPrice = async (
  onePrice: string
): Promise<{ price: string | null; error: string | null }> => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=harmony&vs_currencies=usd"
    );
    const usdPrice = response.data["harmony"].usd;
    return { price: formatUSDAmount(Number(onePrice) * usdPrice), error: null };
  } catch (e) {
    console.log(e);
    return { price: null, error: "Can't retrieve USD price" };
  }
};

export const getONEPrice = async (
  usdPrice: number,
  isCents = true
): Promise<{ price: string | null; error: string | null }> => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=harmony&vs_currencies=usd"
    );
    const price = response.data["harmony"].usd;
    return {
      price: formatONEAmount((isCents ? usdPrice / 100 : usdPrice) / price),
      error: null,
    };
  } catch (e) {
    console.log(e);
    return { price: null, error: "Can't retrieve USD price" };
  }
};
