import {NewMessageEvent} from "telegram/events";
import {TelegramClient} from "telegram";

export class VoiceMemo {
  private readonly client: TelegramClient

  constructor(client: TelegramClient) {
    this.client = client
  }

  public isSupportedEvent(event: NewMessageEvent) {
    return true
  }

  public async onEvent(event: NewMessageEvent) {
    const { message, sender, chatId } = event.message;

    console.log(`New message "${message}" from ${sender?.id}`)

    if(chatId) {
      await this.client.sendMessage(chatId, {
          message: 'Test reply message',
          replyTo: event.message
        })
    }
  }
}
