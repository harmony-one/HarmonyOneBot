import config from "../../../config";

export const appText = {
  welcomeText: `
Hello! I can generate AI Images using OpenAI technology.\n
By default, I generate <b>${config.imageGen.sessionDefault.numImages} image(s)</b> per prompt, with <b>${config.imageGen.sessionDefault.imgSize} size</b>\n
<b>Commands</b>
/help - This menu
/gen [text] - Generates an Image from a given prompt
/genEn [text] - Generates an Image from an enhanced prompt

<b>Edit an Image</b>
To edit the image using OpenAi API, reply to a message in our chat with a picture and 
write the prompt. Also, you can upload a photo and write the prompt in the caption.

<b>Generate images variations</b>
To generates variations of an image using OpenAi API, reply to a message in our chat 
with a picture and write the number of variations (max 10). Also, you can upload a 
photo and write the number of variations in the caption.
`,
  imageGenMain: `\n\n<b>Change images sizes and numbers</b>\n
With the following menu, you can choose how many images can be generated on each prompt. Also, you can change the image size`,
};
