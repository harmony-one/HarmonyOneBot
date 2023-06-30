import axios from "axios";
import config from "../../../config";

const base = axios.create({
  baseURL: config.country.relayApiUrl,
  timeout: 10000,
});

export const relayApi = () => {
  return {
    checkDomain: async ({ sld }: { sld: string }) => {
      try {
        const {
          data: {
            isAvailable,
            isReserved,
            isRegistered,
            regPrice,
            renewPrice,
            transferPrice,
            restorePrice,
            responseText,
            error = "",
          },
        } = await base.post("/check-domain", { sld });
        return {
          isAvailable,
          isReserved,
          isRegistered,
          regPrice,
          renewPrice,
          transferPrice,
          restorePrice,
          responseText,
          error,
        };
      } catch (ex: any) {
        return { error: ex.toString() };
      }
    },
    genNFT: async ({ domain }: { domain: string }) => {
      const {
        data: { generated, metadata },
      } = await base.post("/gen", { domain });
      return {
        generated,
        metadata,
      };
    },
    createCert: async ({
      domain,
      address,
      async = true,
    }: {
      domain: string;
      address?: string;
      async?: boolean;
    }) => {
      const {
        data: { success, sld, mcJobId, nakedJobId, error },
      } = await base.post("/cert", { domain, address, async });
      return {
        success,
        sld,
        mcJobId,
        nakedJobId,
        error,
      };
    },
  };
};
