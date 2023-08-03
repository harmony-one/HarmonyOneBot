import config from "../../../config";

export const appText = {
  imageGenMain: `*🎨 Image Generation DALL·E 2 Help*

Hello! I can generate AI Images using OpenAI technology.\n
By default, I generate *${config.openAi.imageGen.sessionDefault.numImages} image(s)* per prompt, with *${config.openAi.imageGen.sessionDefault.imgSize} size*\n
*Commands*
/help - This menu
/genImg [text] - Generates an Image from a given prompt
/genImgEn [text] - Generates an Image from an enhanced prompt
\n*Generate images variations*
To generates variations of an image using OpenAi API, reply to a message with a picture in the chat and write the number of variations (max 10). Also, you can upload a photo and write the number of variations in the caption.
`,
  imageGenChangeDefault: `*🎨 Image Generation DALL·E 2 Help*\n\n*Change images output sizes and numbers*
With the following menu, you can choose how many images can be generated on each prompt. Also, you can change the image size`,
  chatGptMain: `*🖌️ Chat Gpt 4 Help*
Hello! I can generate AI completions using OpenAI technology.\n
*Commands*
/help - This menu
/chat [text] - Generates a completion from a given prompt.`,
  chatGptChangeModel: `*🖌️ Chat Gpt 4 Help*\nYou can choose one of the following models`,
  generatingText: `Generating response...`,
  gptHelpText: `Write *end* to finish this conversation.\nWrite *help* to repeat this message.`,
  gptChatEnd: "Chat finished. Total tokens used:",
  endChat: "Thanks for using 1.country services",
};

// <b>Edit an Image</b>
// To edit the image using OpenAi API, reply to a message in our chat with a picture and
// write the prompt. Also, you can upload a photo and write the prompt in the caption.
