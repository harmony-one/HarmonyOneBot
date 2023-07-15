import { BotContext } from "../../types";
import config from "../../../config";

// on Menu ctx.from.id returns current user Id, on command returns bot id
export const isAdmin = async (ctx: BotContext) => {
  if (ctx.chat?.type === 'private') {
    return true
  }
  const admins = config.appAdmins
  const currentUser = ctx.from?.id || 0
  const chatAdmins = await ctx.getChatAdministrators()
  const adminsIds = chatAdmins.map(item => item.user.id).concat(admins)
  return adminsIds.includes(currentUser)
}
