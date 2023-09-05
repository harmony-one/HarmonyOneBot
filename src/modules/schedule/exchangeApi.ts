import axios from "axios";

interface CoinGeckoResponse {
  harmony: {
    usd: string;
  };
}

export const getOneRate = async () => {
  const { data } = await axios.get<CoinGeckoResponse>(
    `https://api.coingecko.com/api/v3/simple/price?ids=harmony&vs_currencies=usd`
  );
  return +data.harmony.usd;
}
