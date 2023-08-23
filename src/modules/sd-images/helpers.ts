import config from "../../config";
import { OnCallBackQueryData, OnMessageContext } from "../types";
import { getModelByParam, IModel, MODELS_CONFIGS } from "./api";

export enum COMMAND {
    TEXT_TO_IMAGE = 'image',
    TEXT_TO_IMAGES = 'images',
    CONSTRUCTOR = 'constructor',
    HELP = 'help'
}

export interface IOperation {
    command: COMMAND;
    prompt: string;
    model: IModel;
}

const removeSpaceFromBegin = (text: string) => {
    if (!text) return '';

    let idx = 0;

    // const regex = /^[a-zA-Z\d]$/;

    while (!!text[idx] && text[idx] === ' ') idx++;

    return text.slice(idx);
}

const parsePrompts = (fullText: string): { modelId: string, prompt: string } => {
    let modelId = '';
    let prompt: any;

    let text = fullText;

    if (text.startsWith('/') || text.startsWith(',')) {
        const startIdx = text.indexOf(' ');
        text = startIdx > -1 ? text.slice(startIdx) : '';
    }

    try {
        const startIdx = text.indexOf('--model=');
        const endIdx = text.indexOf(' ', startIdx);

        if (startIdx > -1) {
            prompt = text.split('');
            const modelParamStr = prompt.splice(startIdx, endIdx - startIdx);

            prompt = prompt.join('');
            prompt = removeSpaceFromBegin(prompt);

            modelId = modelParamStr.join('').split('=')[1].replace(/[^a-zA-Z\-\_\d]/g, "");
        } else {
            prompt = removeSpaceFromBegin(text);
        }
    } catch (e) {
        console.log('Warning: sd images parse prompts', e);
    }

    // console.log({ modelId, prompt });

    return { modelId, prompt };
}

type Context = OnMessageContext | OnCallBackQueryData;

export const parseCtx = (ctx: Context): IOperation | false => {
    try {
        if (!ctx.message?.text) {
            return false;
        }

        let {
            modelId,
            prompt
        } = parsePrompts(ctx.message?.text);

        let model = getModelByParam(modelId);
        let command;

        if (ctx.hasCommand('image')) {
            command = COMMAND.TEXT_TO_IMAGE;
        }

        if (ctx.hasCommand('images')) {
            command = COMMAND.TEXT_TO_IMAGES;
        }

        if (ctx.hasCommand('all')) {
            command = COMMAND.CONSTRUCTOR;
        }

        if (ctx.hasCommand('SD')) {
            command = COMMAND.HELP;
        }

        const startWithCmdSymbol = !!ctx.message?.text?.startsWith('/');

        if (startWithCmdSymbol) {
            const cmd = String(ctx.message?.text?.slice(1).split(' ')[0]);
            const modelFromCmd = getModelByParam(cmd);

            if (modelFromCmd) {
                command = COMMAND.TEXT_TO_IMAGE;
                model = modelFromCmd;
            }
        }

        const startWithSpecialSymbol = !!ctx.message?.text?.startsWith(',');

        if (startWithSpecialSymbol) {
            command = COMMAND.TEXT_TO_IMAGE;
        }

        if (!model) {
            model = MODELS_CONFIGS[0];
        }

        if (!prompt) {
            prompt = model.defaultPrompt;
        }

        if (command) {
            return {
                command,
                model,
                prompt
            }
        }
    } catch (e) {
        console.log('Error: SD images parse prompts', e);
    }

    return false;
}