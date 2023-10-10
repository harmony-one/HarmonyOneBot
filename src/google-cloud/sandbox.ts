import { gcTranslateClient } from './gcTranslateClient'

async function main (): Promise<void> {
  const client = gcTranslateClient
  const languageList = await client.getLanguageList()

  console.log('### languageList', languageList.length)

  const codes = languageList.map(lang => lang.code)
  console.log('### codes', JSON.stringify(codes))
  // for (const lang of languageList) {
  //   console.log(lang)
  // }

  const r = await client.translate('你好', 'ru')
  console.log('### r', r)
}

main().then(() => { console.log('### finish') }).catch(console.log)
