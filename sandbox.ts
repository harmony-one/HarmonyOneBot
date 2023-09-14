import LanguageDetect from 'languagedetect'
import {chatCompletion} from "./src/modules/open-ai/api/openAi";
const lngDetector = new LanguageDetect();

async function main() {
  const conversation = [
    { role: "system", content: "You will be provided with a sentence, and your task is detect original language. Use language codes for response. If you can't detect language use word 'unknown' for response" },
    { role: "user", content: '1' }
  ];

  const response = await chatCompletion(conversation);

  console.log('### response', response);
}


main();