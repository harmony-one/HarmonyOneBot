import express from "express";
import { initTelegramClient } from './telegramApi'
import {NewMessage, NewMessageEvent} from "telegram/events";
import { VoiceMemo } from './modules/voice-memo'

const listenEvents = async () => {
  const client = await initTelegramClient()
  const voiceMemo = new VoiceMemo(client)

  async function onEvent(event: NewMessageEvent) {
    if(voiceMemo.isSupportedEvent(event)) {
      voiceMemo.onEvent(event)
    }
  }

  client.addEventHandler(onEvent, new NewMessage({}));
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot listening on port ${PORT}`);
});
listenEvents()
