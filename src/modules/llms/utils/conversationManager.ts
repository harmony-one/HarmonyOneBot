import { type VisionContent, type ChatConversation } from '../../types'

const MINUTE_IN_MS = 60000 // 1 minute in milliseconds
const INACTIVE_THRESHOLD = 5 * MINUTE_IN_MS // 5 minutes
const IDLE_THRESHOLD = MINUTE_IN_MS // 1 minute
const IDLE_MESSAGE_LIMIT = 5

// const HOUR_IN_MS = 3600000 // 1 hour in milliseconds
// const INACTIVE_THRESHOLD = 12 * HOUR_IN_MS // 12 hours
// const IDLE_THRESHOLD = HOUR_IN_MS // 1 hour
// const IDLE_MESSAGE_LIMIT = 5

// Utility functions
export const conversationManager = {
  manageConversationWindow (conversation: ChatConversation[]): ChatConversation[] {
    console.log('fco::::::: here', conversation.length)
    if (conversation.length === 0) return conversation
    const now = Date.now()
    const lastMessageTime = conversation[conversation.length - 1].timestamp
    const timeDifference = now - lastMessageTime
    // Case 1: Inactive conversation (>12 hours) - Reset
    if (timeDifference > INACTIVE_THRESHOLD) {
      return []
    }

    // Case 2: Idle conversation (>1 hour) - Keep last 5 messages
    if (timeDifference > IDLE_THRESHOLD) {
      return conversation.slice(-IDLE_MESSAGE_LIMIT)
    }

    // Case 3: Active conversation (<1 hour) - Keep full history
    return conversation
  },

  addMessageWithTimestamp (message: Omit<ChatConversation, 'timestamp'> | Partial<Omit<ChatConversation, 'content' | 'timestamp'>> & { content: string | VisionContent[] }): ChatConversation {
    return {
      ...message,
      timestamp: Date.now()
    }
  }
}
