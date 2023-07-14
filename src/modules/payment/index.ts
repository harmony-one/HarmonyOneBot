import pino, {Logger} from "pino";

export class BotPayments {
  private logger: Logger;
  constructor() {
    this.logger = pino({
      name: 'Payments',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    })
  }

}
