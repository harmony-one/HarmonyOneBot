import { completion } from 'litllm'

export const llmTest = () => {
  completion("gpt-4", [{ role: "user", content: "What's lit?" }],{}).then((res) => {
    console.log(res.message.content);
  });
}
