import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import config from "./config";

const {
  telegramBotAuthToken,
  voiceMemo: { telegramApiId, telegramApiHash },
} = config;

const stringSession = new StringSession();

export const initTelegramClient = async () => {
  const client = new TelegramClient(
    stringSession,
    telegramApiId,
    telegramApiHash,
    {
      connectionRetries: 5,
    }
  );
  await client.start({
    botAuthToken: telegramBotAuthToken,
    onError: (err) => console.log(err),
  });
  console.log("Telegram session:", client.session.save());
  return client;
};
