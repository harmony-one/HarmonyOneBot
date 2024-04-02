export enum SupportedCommands {
  claudeOpus = 'claude',
  opus = 'opus',
  claudeSonnet = 'claudes',
  opusShort = 'c',
  sonnet = 'sonnet',
  sonnetShort = 's',
  claudeHaiku = 'haiku',
  haikuShort = 'h',
}

const CLAUDE_OPUS_PREFIX_LIST = ['c. ']

export const hasClaudeOpusPrefix = (prompt: string): string => {
  const prefixList = CLAUDE_OPUS_PREFIX_LIST
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
}

export const hasPrefix = (prompt: string): string => {
  return (
    hasClaudeOpusPrefix(prompt)
  )
}
