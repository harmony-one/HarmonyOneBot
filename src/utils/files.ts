import * as pathLib from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as https from 'https'
import type { File } from '@grammyjs/types/manage.js'
import config from '../config'

export const createTempFile = async (): Promise<string> =>
  pathLib.join(
    await fs.promises.mkdtemp(
      (await fs.promises.realpath(os.tmpdir())) + pathLib.sep
    ),
    'filedata'
  )

export const copyFile = fs.promises.copyFile

export async function downloadFile (url: string, dest: string): Promise<void> {
  const file = fs.createWriteStream(dest)
  await new Promise<void>((resolve, reject) => {
    https.get(url, (res) => {
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on(
      'error',
      (err0) => { fs.unlink(dest, (err1) => { reject(err1 ?? err0) }) }
    )
  })
}

const buildFileUrl = (root: string, token: string, path: string): string => `${root}/file/bot${token}/${path}`
const buildLink = (path: string): string => {
  return buildFileUrl('https://api.telegram.org', config.telegramBotAuthToken, path)
}
function getUrl (file: File): string {
  const path = file.file_path
  if (path === undefined) {
    const id = file.file_id
    throw new Error(`File path is not available for file '${id}'`)
  }
  return pathLib.isAbsolute(path) ? path : buildLink(path)
}

export async function download (file: File, path?: string): Promise<string> {
  const url = getUrl(file)
  if (path === undefined) path = await createTempFile()
  if (pathLib.isAbsolute(url)) await copyFile(url, path)
  else await downloadFile(url, path)
  return path
}
