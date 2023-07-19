import { Menu } from "@grammyjs/menu";

import { appText } from "../utils/text";
import { BotContext } from "../../types";
import { isAdmin } from "../utils/context";
import { MenuIds } from "../../../constants";

export const chatMainMenu = new Menu<BotContext>(MenuIds.CHAT_GPT_MAIN)
  .text("help", (ctx) => {
    ctx
      .editMessageText(appText.chatGptMain, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch((ex) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .text(
    (ctx) =>
      `${
        ctx.session.openAi.chatGpt.isEnabled
          ? "🔴 Disable bot"
          : "🟢 Enable bot"
      }`,
    async (ctx) => {
      if (await isAdmin(ctx)) {
        ctx.session.openAi.chatGpt.isEnabled =
          !ctx.session.openAi.chatGpt.isEnabled;
        ctx.menu.update();
      } else {
        ctx
          .editMessageText("Only the group owner can enable/disable this bot", {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          })
          .catch((ex) => console.log("### ex", ex));
      }
    }
  )
  .row()
  .text("Change default model", async (ctx) => {
    if (await isAdmin(ctx)) {
      ctx
        .editMessageText(appText.chatGptChangeModel, {
          parse_mode: "HTML",
          reply_markup: chatGPTimageDefaultOptions,
        })
        .catch((ex) => {
          console.log("### ex", ex);
        });
    } else {
      ctx
        .editMessageText(
          "Only the group owner can change OpenAI configuration",
          {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          }
        )
        .catch((ex) => console.log("### ex", ex));
    }
  })
  .row()
  .back("Back to the Main Menu");

const chatGPTimageDefaultOptions = new Menu<BotContext>(MenuIds.CHAT_GPT_MODEL)
  // gpt-4, gpt-4-0613, gpt-4-32k, gpt-4-32k-0613, gpt-3.5-turbo, gpt-3.5-turbo-0613, gpt-3.5-turbo-16k, gpt-3.5-turbo-16k-0613
  .text("gpt-4", (ctx) => setModel("gpt-4", ctx))
  .text("gpt-4-32k", (ctx) => setModel("gpt-4-32k", ctx))
  .row()
  .text("gpt-3.5-turbo", (ctx) => setModel("gpt-3.5-turbo", ctx))
  .text("gpt-3.5-turbo-16k", (ctx) => setModel("gpt-3.5-turbo-16k", ctx))
  .row()
  .back("Back");

function setModel(m: string, ctx: any) {
  ctx.session.openAi.chatGpt.model = m;
  ctx
    .editMessageText("Chat GPT model updated", {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    })
    .catch((ex: any) => console.log("### ex", ex));
  ctx.menu.back();
}

chatMainMenu.register(chatGPTimageDefaultOptions);
