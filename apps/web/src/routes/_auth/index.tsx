import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";

import { AssistantChat } from "@/components/assistant/assistant-chat";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const HomePage = () => {
  // AuthGate only renders this once the session has resolved.
  const { data: session } = authClient.useSession();
  const { data, isPending } = useQuery(
    orpc.assistant.getConversation.queryOptions()
  );

  // SAFETY: `parts` is the JSON the assistant's own stream wrote, so the stored
  // shape is `UIMessage["parts"]` by construction; the API cannot type a JSON
  // column more precisely than that.
  const initialMessages = data?.messages as UIMessage[] | undefined;

  return (
    <AssistantChat
      configured={data?.configured ?? true}
      conversationId={data?.conversationId}
      initialMessages={initialMessages}
      isPending={isPending}
      userName={session?.user.name ?? ""}
    />
  );
};

export const Route = createFileRoute("/_auth/")({
  component: HomePage,
});
