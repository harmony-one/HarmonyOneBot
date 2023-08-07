import { BotContext } from "../../types";
import config from "../../../config";

// on Menu ctx.from.id returns current user Id, on command returns bot id
export const isAdmin = async (ctx: BotContext, fromMenu = true, isRestricted = false) => {
  if (ctx.chat?.type === "private" && !isRestricted) {
    return true
  }
  const admins = config.appAdmins;
  const currentUser = (fromMenu ? ctx.from?.id : ctx.update.message?.from.id) || 0 
  const chatAdmins = ctx.chat?.type !== "private" ? await ctx.getChatAdministrators() : [];
  const adminsIds = chatAdmins.map((item: any) => item.user.id).concat(admins);
  return adminsIds.includes(currentUser);
};
