import {
  activeConversation,
  archiveActiveConversation,
  conversationMessages,
} from "../assistant/conversation";
import { isAssistantConfigured } from "../assistant/provider";
import { protectedProcedure } from "../index";

export const assistantRouter = {
  /**
   * The transcript to replay on load, plus whether this deployment has a model
   * at all — the interface has to say "not configured" before it offers a
   * composer, rather than failing on the first question.
   *
   * The id is what the interface keys its chat on, so archiving a thread and
   * refetching is all it takes to start a new one.
   */
  getConversation: protectedProcedure.handler(async ({ context }) => {
    const conversation = await activeConversation(context.session.user.id);
    const messages = await conversationMessages(conversation.id);

    return {
      configured: isAssistantConfigured(),
      conversationId: conversation.id,
      messages: messages.map((message) => ({
        id: message.id,
        // `UIMessage["parts"]` as the streaming turn wrote it.
        parts: message.parts,
        role:
          message.role === "USER" ? ("user" as const) : ("assistant" as const),
      })),
    };
  }),

  startNewConversation: protectedProcedure.handler(async ({ context }) => {
    await archiveActiveConversation(context.session.user.id);
    return { ok: true };
  }),
};
