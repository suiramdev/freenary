import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";

import { orpc } from "@/shared/api";
import { authClient } from "@/shared/auth";

import { AssistantChat } from "./assistant-chat";

export const HomePage = () => {
  const { data: session } = authClient.useSession();
  const { data, isPending } = useQuery(
    orpc.assistant.getConversation.queryOptions()
  );

  /* SAFETY: `parts` is the JSON the assistant's own stream wrote, so the stored
     shape is `UIMessage["parts"]` by construction; the API cannot type a JSON
     column more precisely than that. */
  const initialMessages = data?.messages as UIMessage[] | undefined;

  return (
    <AssistantChat
      conversationId={data?.conversationId}
      initialMessages={initialMessages}
      isPending={isPending}
      serverModel={data?.serverModel ?? null}
      userName={session?.user.name ?? ""}
    />
  );
};
