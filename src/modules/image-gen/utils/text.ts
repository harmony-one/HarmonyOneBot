import config from "../../../config";

export const appText = {
  welcomeText: `*🖌️ Image Generation DALL·E 2 Help*

Hello! I can generate AI Images using OpenAI technology.\n
By default, I generate *${config.imageGen.sessionDefault.numImages} image(s)* per prompt, with *${config.imageGen.sessionDefault.imgSize} size*\n
*Commands*
/help - This menu
/genImg [text] - Generates an Image from a given prompt
/genImgEn [text] - Generates an Image from an enhanced prompt

*Generate images variations*
To generates variations of an image using OpenAi API, reply to a message in our chat 
with a picture and write the number of variations (max 10). Also, you can upload a 
photo and write the number of variations in the caption.
`,
  imageGenMain: `\n\n*Change images output sizes and numbers*\n
With the following menu, you can choose how many images can be generated on each prompt. Also, you can change the image size`,
};

// <b>Edit an Image</b>
// To edit the image using OpenAi API, reply to a message in our chat with a picture and
// write the prompt. Also, you can upload a photo and write the prompt in the caption.
