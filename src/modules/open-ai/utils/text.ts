import config from "../../../config";

export const appText = {
  imageGenMain: `*🎨 DALL·E 2 Help*

I generate *${config.openAi.imageGen.sessionDefault.numImages} ${config.openAi.imageGen.sessionDefault.imgSize}* image(s) per prompt\n

*1. GENERATE A STANDARD PROMPT*
• Use */genImg* <TEXT>
Example: 
\`/genImg beautiful scenery, purple galaxy bottle\`

*2. GENERATE AN ENHANCED IMAGE*
• Use */genImgEn* <TEXT>
Example: 
\`/genImgEn beautiful scenery, horse trotting\`

`,

// `*3. GENERATE IMAGE VARIATIONS*
// To generates variations of an image using OpenAi API, reply to a message in our chat 
// with a picture and write the number of variations (max 10). Also, you can upload a 
// photo and write the number of variations in the caption.
//`

imageGenChangeDefault: `*🎨 Image Generation DALL·E 2 Help*\n\n*Change image output sizes and numbers*
Adjust image size or how many images are generated`,
  chatGptMain: `*🖌️ ChatGPT Help*
*1. CHAT WITH AI*
• Use */chat* <TEXT>`,
  chatGptChangeModel: `*🖌️ ChatGPT Help*\nChoose one of the following models`,
  generatingText: `Generating response...`,
  gptHelpText: `Write *end* to finish this conversation.\nWrite *help* to repeat this message.`,
  gptChatEnd: 'Chat finished. Total tokens used:',
  endChat: 'Thanks for using 1.country services'
};

// <b>Edit an Image</b>
// To edit the image using OpenAi API, reply to a message in our chat with a picture and
// write the prompt. Also, you can upload a photo and write the prompt in the caption.
