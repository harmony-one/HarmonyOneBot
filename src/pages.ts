import { Menu } from "@grammyjs/menu";
import { BotContext } from "./bot";
import { imageGenMainMenu } from "./modules/image-gen/pages/main";

export const mainMenu = new Menu<BotContext>('main-menu') //<MyContext>
  .text('Voice Memo', (ctx) => ctx.reply('Menu to be define'))
  .row()
  .submenu('Image Generation AI', 'image-gen-main')

mainMenu.register(imageGenMainMenu)
