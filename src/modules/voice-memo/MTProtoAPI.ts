import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import config from '../../config'

const {
  telegramBotAuthToken,
  voiceMemo: {
    telegramApiId,
    telegramApiHash
} } = config

const sessionId = ''

const stringSession = new StringSession(sessionId);

export const initTelegramClient = async () => {
  const client = new TelegramClient(stringSession, telegramApiId, telegramApiHash, {
    connectionRetries: 5,
  });
  await client.start({
    botAuthToken: telegramBotAuthToken,
    onError: (err) => console.log('Telegram client error:', err),
  });
  client.session.save()
  return client
}
