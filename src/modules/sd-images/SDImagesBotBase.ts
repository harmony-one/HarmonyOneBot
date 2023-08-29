import { SDNodeApi, IModel } from "./api";
import { OnMessageContext, OnCallBackQueryData } from "../types";
import { sleep, uuidv4 } from "./utils";
import { InputFile } from "grammy";
import { COMMAND } from './helpers';

export interface ISession {
    id: string;
    author: string;
    prompt: string;
    model: IModel;
    all_seeds?: string[];
    seed?: number;
    command: COMMAND;
    message: string;
}

export class SDImagesBotBase {
    sdNodeApi: SDNodeApi;

    private sessions: ISession[] = [];
    queue: string[] = [];

    constructor() {
        this.sdNodeApi = new SDNodeApi();
    }

    createSession = async (
        ctx: OnMessageContext | OnCallBackQueryData,
        params: {
            prompt: string;
            model: IModel;
            command: COMMAND;
            all_seeds?: string[];
            seed?: string;
        }
    ) => {
        const { prompt, model, command, all_seeds } = params;

        const authorObj = await ctx.getAuthor();
        const author = `@${authorObj.user.username}`;

        const sessionId = uuidv4();
        const message = (ctx.message?.text || '').replace('/images', '/image');

        const newSession: ISession = {
            id: sessionId,
            author,
            prompt: prompt,
            model,
            command,
            all_seeds,
            message
        };

        this.sessions.push(newSession);

        return newSession;
    }

    getSessionById = (id: string) => this.sessions.find(s => s.id === id);

    waitingQueue = async (uuid: string, ctx: OnMessageContext | OnCallBackQueryData,): Promise<number> => {
        this.queue.push(uuid);

        let idx = this.queue.findIndex((v) => v === uuid);

        const { message_id } = await ctx.reply(
            `You are #${idx + 1}, wait about ${(idx + 1) * 30} seconds`
        );

        // waiting queue
        while (idx !== 0) {
            await sleep(3000 * this.queue.findIndex((v) => v === uuid));
            idx = this.queue.findIndex((v) => v === uuid);
        }

        return message_id;
    }

    generateImage = async (
        ctx: OnMessageContext | OnCallBackQueryData,
        refundCallback: (reason?: string) => void,
        session: ISession
    ) => {
        const { model, prompt, seed } = session;
        const uuid = uuidv4();

        try {
            const queueMessageId = await this.waitingQueue(uuid, ctx);

            ctx.chatAction = "upload_photo";

            const imageBuffer = await this.sdNodeApi.generateImage(
                prompt,
                model,
                seed
            );

            const reqMessage = session.message ?
                session.message.split(' ').length > 1 ?
                    session.message :
                    `${session.message} ${prompt}`
                :
                `/${model.aliases[0]} ${prompt}`;

            await ctx.replyWithPhoto(new InputFile(imageBuffer), {
                caption: reqMessage,
            });

            if (ctx.chat?.id && queueMessageId) {
                await ctx.api.deleteMessage(ctx.chat?.id, queueMessageId);
            }
        } catch (e) {
            console.error(e);
            ctx.reply(`Error: something went wrong... Refunding payments`);
            refundCallback();
        }

        this.queue = this.queue.filter((v) => v !== uuid);
    }
}