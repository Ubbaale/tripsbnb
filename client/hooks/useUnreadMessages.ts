import { useQuery } from "@tanstack/react-query";

interface ChatConversation {
  id: string;
  unreadCount: number;
}

export function useUnreadMessages() {
  const { data: conversations = [] } = useQuery<ChatConversation[]>({
    queryKey: ["/api/chat/conversations?userId=anonymous"],
    refetchInterval: 15000,
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return { totalUnread, conversations };
}
