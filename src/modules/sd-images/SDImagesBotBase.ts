import { SDNodeApi, getModelByParam, IModel } from "./api";
import { OnMessageContext, OnCallBackQueryData } from "../types";
import { sleep, uuidv4 } from "./utils";
import { InlineKeyboard, InputFile } from "grammy";

export class SDImagesBotBase {
    sdNodeApi: SDNodeApi;

    queue: string[] = [];

    constructor() {
        this.sdNodeApi = new SDNodeApi();
    }

    waitingQueue = async (uuid: string, ctx: OnMessageContext | OnCallBackQueryData,) => {
        this.queue.push(uuid);

        let idx = this.queue.findIndex((v) => v === uuid);

        if (idx >= 0) {
            ctx.reply(
                `You are #${idx + 1}, wait about ${(idx + 1) * 30} seconds`
            );
        }

        // waiting queue
        while (idx !== 0) {
            await sleep(3000 * this.queue.findIndex((v) => v === uuid));
            idx = this.queue.findIndex((v) => v === uuid);
        }
    }

    generateImage = async (
        ctx: OnMessageContext | OnCallBackQueryData,
        refundCallback: (reason?: string) => void,
        prompt: string,
        model: IModel,
        seed?: number
    ) => {
        const uuid = uuidv4();

        try {
            await this.waitingQueue(uuid, ctx);

            ctx.chatAction = "upload_photo";

            const imageBuffer = await this.sdNodeApi.generateImage(
                prompt,
                model,
                seed
            );

            await ctx.replyWithPhoto(new InputFile(imageBuffer), {
                caption: `/${model.aliases[0]} ${prompt}`,
            });
        } catch (e) {
            console.error(e);
            ctx.reply(`Error: something went wrong... Refunding payments`);
            refundCallback();
        }

        this.queue = this.queue.filter((v) => v !== uuid);
    }
}