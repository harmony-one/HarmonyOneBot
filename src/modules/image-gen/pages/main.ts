import { Menu } from "@grammyjs/menu";

import { appText } from "../utils/text";
import { BotContext } from "../../types";

export const imageGenMainMenu = new Menu<BotContext>("image-gen-main") //<MyContext>
  .text("help", (ctx) => {
    ctx.reply(appText.welcomeText, {
      parse_mode: "HTML",
      reply_markup: imageGenMainMenu,
    });
  })
  .row()
  .text("Change default values", (ctx) =>
    ctx.reply(appText.imageGenMain, {
      parse_mode: "HTML",
      reply_markup: imageDefaultOptions,
    })
  )
  .row()
  .back("Back to the Main Menu");

const imageDefaultOptions = new Menu<BotContext>("image-default-options")
  .submenu("Change the image number", "image-gen-number")
  .row()
  .submenu("Change the image size", "image-gen-size")
  .row()
  .back("Back to previous Menu");

const imageGenNumberOptions = new Menu<BotContext>("image-gen-number")
  .text("1", (ctx) => setImageNumber(1, ctx))
  .text("2", (ctx) => setImageNumber(2, ctx))
  .text("3", (ctx) => setImageNumber(3, ctx))
  .row()
  .text("4", (ctx) => setImageNumber(4, ctx))
  .text("5", (ctx) => setImageNumber(5, ctx))
  .text("6", (ctx) => setImageNumber(6, ctx))
  .row()
  .text("7", (ctx) => setImageNumber(7, ctx))
  .text("8", (ctx) => setImageNumber(8, ctx))
  .text("9", (ctx) => setImageNumber(9, ctx))
  .row()
  .back("Back to Menu");

const imageGenSizeOptions = new Menu<BotContext>("image-gen-size")
  .text("256x256", (ctx) => {
    console.log(typeof ctx)
    setImageSize("256x256", ctx)
  })
  .text("512x512", (ctx) => setImageSize("512x512", ctx))
  .text("1024x1024", (ctx) => setImageSize("1024x1024", ctx))
  .row()
  .back("Back to Menu");

function setImageNumber(n: number, ctx: any) { //Filter<BotContext,''
  ctx.session.imageGen.numImages = n;
  ctx.reply("Images generated per prompt updated");
  ctx.menu.back();
}

function setImageSize(s: string, ctx: any) {
  ctx.session.imageGen.imgSize = s;
  ctx.reply("Images size per prompt updated");
  ctx.menu.back();
}

imageGenMainMenu.register(imageDefaultOptions);
imageDefaultOptions.register(imageGenNumberOptions);
imageDefaultOptions.register(imageGenSizeOptions);
