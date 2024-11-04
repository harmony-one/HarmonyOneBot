import {
  type VisionContent,
  type ChatConversation,
  type OnMessageContext,
  type OnCallBackQueryData,
  type ConversationManagerState,
  type BotSessionData,
  type LlmsSessionData,
  type ImageGenSessionData
} from '../../types'

// Constants for time calculations
const MS_PER_DAY = 24 * 60 * 60 * 1000
const CLEANUP_HOUR = 3 // 3 AM cleanup time

const getSession = (ctx: OnMessageContext | OnCallBackQueryData, sessionDataKey: string):
LlmsSessionData & ImageGenSessionData => {
  return ctx.session[sessionDataKey as keyof BotSessionData] as LlmsSessionData & ImageGenSessionData
}

const conversationManager = {
  /**
   * Initialize or update cleanup timestamps
   */
  initializeCleanupTimes (): ConversationManagerState {
    const now = new Date()
    const today3AM = new Date(now)
    today3AM.setHours(CLEANUP_HOUR, 0, 0, 0)

    if (now.getTime() >= today3AM.getTime()) {
      // If current time is past 3 AM, set next cleanup to tomorrow 3 AM
      return {
        nextCleanupTime: today3AM.getTime() + MS_PER_DAY,
        lastCleanupTime: today3AM.getTime()
      }
    } else {
      // If current time is before 3 AM, set next cleanup to today 3 AM
      return {
        nextCleanupTime: today3AM.getTime(),
        lastCleanupTime: today3AM.getTime() - MS_PER_DAY
      }
    }
  },

  /**
   * Check if cleanup is needed based on context
   */
  needsCleanup (ctx: OnMessageContext | OnCallBackQueryData, sessionDataKey: string): boolean {
    const now = Date.now()
    const session = getSession(ctx, sessionDataKey)

    // Initialize times if not set
    if (!session.cleanupState || session.cleanupState.nextCleanupTime === 0) {
      session.cleanupState = this.initializeCleanupTimes()
    }

    // Check if we've passed the next cleanup time
    if (now >= session.cleanupState.nextCleanupTime) {
      // Update cleanup times in session
      session.cleanupState = {
        lastCleanupTime: session.cleanupState.nextCleanupTime,
        nextCleanupTime: session.cleanupState.nextCleanupTime + MS_PER_DAY
      }
      return true
    }

    return false
  },

  /**
   * Manage conversation window with context-aware cleanup
   */
  manageConversationWindow (conversation: ChatConversation[], ctx: OnMessageContext | OnCallBackQueryData, sessionDataKey: string): ChatConversation[] {
    if (conversation.length === 0) return conversation

    // Only perform cleanup if needed
    if (this.needsCleanup(ctx, sessionDataKey)) {
      const session = getSession(ctx, sessionDataKey)
      return conversation.filter(msg => msg.timestamp >= session.cleanupState.lastCleanupTime)
    }

    return conversation
  },

  /**
   * Add a new message to the conversation with current timestamp
   */
  addMessageWithTimestamp (
    message: Omit<ChatConversation, 'timestamp'> |
    Partial<Omit<ChatConversation, 'content' | 'timestamp'>> &
    { content: string | VisionContent[] },
    ctx: OnMessageContext | OnCallBackQueryData
  ): ChatConversation {
    // Initialize times if not set
    if (!ctx.session.llms.cleanupState || ctx.session.llms.cleanupState.nextCleanupTime === 0) {
      ctx.session.llms.cleanupState = this.initializeCleanupTimes()
    }

    return {
      ...message,
      timestamp: Date.now()
    }
  }
}

export { conversationManager }
