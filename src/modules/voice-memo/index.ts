export class VoiceMemo {

  constructor() {}

  public isSupportedEvent(ctx: any) {
    return true
  }

  public async onEvent(ctx: any) {
    const { text } = ctx.update.message
    console.log('Text: ', text)

    ctx.reply('Voice memo reply');
  }
}
