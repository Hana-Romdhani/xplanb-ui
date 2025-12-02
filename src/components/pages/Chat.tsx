import { useState, useEffect, useRef } from 'react';
import { Send, Smile } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Menu } from 'lucide-react';
import { chatApi, Conversation, Message } from '../../api/chat';
import { chatService } from '../../services/chatService';
import { getUserById } from '../../lib/services/userService';
import { toast } from 'sonner';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  picture?: string;
}

export default function Chat() {
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const [pendingConversationJoin, setPendingConversationJoin] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isConversationsSheetOpen, setIsConversationsSheetOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Common emojis - flattened array for compact grid display
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😢',
    '😭', '😤', '😠', '😡', '🤬', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶',
    '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴'
  ];

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setEmojiPickerOpen(false);
  };

  const normalizeId = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (obj._id) return normalizeId(obj._id);
      if (obj.id) return normalizeId(obj.id);
      if (obj.$oid) return normalizeId(obj.$oid);
      if (typeof (value as { toString(): string }).toString === 'function') {
        return (value as { toString(): string }).toString();
      }
    }
    return '';
  };

  const dedupeConversations = (items: Conversation[]): Conversation[] => {
    const seen = new Map<string, Conversation>();
    for (const conv of items) {
      const participantKeys = conv.participants
        .map((p: any) => normalizeId(p))
        .filter((id) => id && id !== normalizeId(currentUser?._id))
        .sort()
        .join('|') || normalizeId(conv._id);

      const existing = seen.get(participantKeys);
      if (!existing) {
        seen.set(participantKeys, conv);
        continue;
      }

      const existingTime = new Date(existing.lastActivity || existing.updatedAt || existing.createdAt).getTime();
      const currentTime = new Date(conv.lastActivity || conv.updatedAt || conv.createdAt).getTime();
      if (currentTime > existingTime) {
        seen.set(participantKeys, conv);
      }
    }
    return Array.from(seen.values()).sort((a, b) => {
      const aTime = new Date(a.lastActivity || a.updatedAt || a.createdAt).getTime();
      const bTime = new Date(b.lastActivity || b.updatedAt || b.createdAt).getTime();
      return bTime - aTime;
    });
  };

  // Get current user on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        const userId = decoded.id || decoded._id || decoded.userId;
        const userData = await getUserById(userId);
        setCurrentUser(userData);
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const data = await chatApi.getConversations();
        const deduped = dedupeConversations(data);
        setConversations(deduped);

        // Load unread counts
        const counts = await chatApi.getUnreadCount();
        setUnreadCounts(counts);

        // Load only users with whom I have a shared folder
        const sharedUsers = await chatApi.getSharedUsers();
        setAllUsers(sharedUsers);

        if (data.length > 0) {
          setSelectedConversation(data[0]);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        try {
          const sharedUsers = await chatApi.getSharedUsers();
          setAllUsers(sharedUsers);
        } catch (e) {
          console.error('Error loading shared users:', e);
        }
        toast.error('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      try {
        const data = await chatApi.getMessages(selectedConversation._id);
        setMessages(data);

        // Mark as read
        await chatApi.markAsRead(selectedConversation._id);

        // Update unread counts
        const counts = await chatApi.getUnreadCount();
        setUnreadCounts(counts);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      }
    };
    loadMessages();
  }, [selectedConversation?._id]);

  // Setup WebSocket connection and event handlers
  useEffect(() => {
    if (!currentUser) return;

    chatService.connect();

    chatService.on({
      onMessage: (newMessage: Message) => {
        const messageConvId = normalizeId(newMessage.conversationId);
        const currentConvId = normalizeId(selectedConversation?._id);

        if (messageConvId === currentConvId) {
          setMessages((prev) => {
            const messageId = normalizeId(newMessage._id);

            // Replace optimistic message
            const hasOptimistic = prev.some(msg => {
              const msgId = normalizeId(msg._id);
              return msgId.startsWith('temp_') && msg.content === newMessage.content;
            });

            if (hasOptimistic) {
              return prev
                .filter(msg => !normalizeId(msg._id).startsWith('temp_') || msg.content !== newMessage.content)
                .concat([newMessage])
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }

            const exists = prev.some(msg => normalizeId(msg._id) === messageId && msg.content === newMessage.content);
            if (exists) return prev;

            const existingIndex = prev.findIndex(msg => normalizeId(msg._id) === messageId);
            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex] = newMessage;
              return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }

            return [...prev, newMessage].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });

          // Mark as read if it's not our own message
          if (currentUser) {
            const senderId = typeof newMessage.senderId === 'object'
              ? (newMessage.senderId._id || newMessage.senderId.toString())
              : newMessage.senderId.toString();
            const userId = currentUser._id.toString();
            if (senderId !== userId) {
              chatService.markAsRead(newMessage.conversationId);
            }
          }
        } else {
          setUnreadCounts((prev) => ({
            ...prev,
            [messageConvId]: (prev[messageConvId] || 0) + 1,
          }));
        }

        // Update conversation list with latest message
        setConversations((prev) =>
          dedupeConversations(
            prev.map((conv) => {
              const convId = normalizeId(conv._id);
              return convId === messageConvId
                ? { ...conv, lastMessage: newMessage, lastActivity: new Date() }
                : conv;
            })
          )
        );
      },
      onUserOnline: (data: { userId: string }) => {
        setOnlineUserIds((prev) => new Set([...prev, data.userId]));
      },
      onUserOffline: (data: { userId: string }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      },
      onOnlineUsers: (data: { userIds: string[] }) => {
        setOnlineUserIds(new Set(data.userIds));
      },
      onError: (error: { message: string }) => {
        console.error('Chat WebSocket error:', error);
        setWsConnected(false);
      },
      onConversationJoined: (data: { conversationId: string }) => {
        const conversationId = data.conversationId;
        setWsConnected(true);
        if (conversationId) {
          setPendingConversationJoin((prev) => (prev === conversationId ? null : prev));
        }
      },
    });

    const checkConnection = setInterval(() => {
      setWsConnected(chatService.connected);
    }, 3000);

    return () => {
      clearInterval(checkConnection);
      chatService.off();
      chatService.disconnect();
    };
  }, [selectedConversation?._id, currentUser]);

  // Join conversation room when selected
  useEffect(() => {
    if (!selectedConversation) {
      setPendingConversationJoin(null);
      return;
    }

    const conversationId = normalizeId(selectedConversation._id);
    if (!conversationId) return;

    if (chatService.connected) {
      chatService.joinConversation(conversationId);
      chatService.getOnlineUsers(conversationId);
      setPendingConversationJoin(null);
    } else {
      setPendingConversationJoin(conversationId);
      chatService.connect();
    }
  }, [selectedConversation?._id]);

  // Join pending conversation once socket connection is ready
  useEffect(() => {
    if (wsConnected && pendingConversationJoin) {
      chatService.joinConversation(pendingConversationJoin);
      chatService.getOnlineUsers(pendingConversationJoin);
      setPendingConversationJoin(null);
    }
  }, [wsConnected, pendingConversationJoin]);

  // Scroll to bottom when messages change
  const initialLoadRef = useRef(true);
  const prevMessagesCountRef = useRef(0);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      prevMessagesCountRef.current = messages.length;
      return;
    }

    if (messages.length > prevMessagesCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevMessagesCountRef.current = messages.length;
  }, [messages]);

  // Filter online users for the current conversation
  useEffect(() => {
    if (!selectedConversation) {
      setOnlineUsers([]);
      return;
    }

    const participantIds = selectedConversation.participants.map((p: any) => normalizeId(p));
    const online = allUsers.filter((user) => {
      const userId = normalizeId(user._id);
      return participantIds.includes(userId) && onlineUserIds.has(userId);
    });
    setOnlineUsers(online);
  }, [selectedConversation, allUsers, onlineUserIds]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversation || !currentUser) return;

    const messageText = message.trim();
    const conversationId = normalizeId(selectedConversation._id);
    if (!conversationId) return;
    const tempMessageId = `temp_${Date.now()}`;

    const optimisticMessage: Message = {
      _id: tempMessageId,
      conversationId: conversationId,
      senderId: {
        _id: currentUser._id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        picture: currentUser.picture,
      },
      content: messageText,
      read: false,
      type: 'text',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessage('');

    try {
      chatService.sendMessage(conversationId, messageText);

      setTimeout(async () => {
        try {
          const updatedMessages = await chatApi.getMessages(conversationId);
          setMessages((prev) => {
            const withoutOptimistic = prev.filter(msg => msg._id !== tempMessageId);
            const existingIds = new Set(withoutOptimistic.map(m => m._id?.toString()));
            const newMessages = updatedMessages.filter(msg => !existingIds.has(msg._id?.toString()));
            const combined = [...withoutOptimistic, ...newMessages];
            return combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
        } catch (err) {
          console.error('Error reloading messages:', err);
        }
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setMessages((prev) => prev.filter(msg => msg._id !== tempMessageId));
      setMessage(messageText);
    }
  };

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const formatMessageTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    if (conv.type === 'direct' && conv.participants.length === 2) {
      const otherUser = conv.participants.find((p: any) => normalizeId(p) !== normalizeId(currentUser?._id));
      if (otherUser && typeof otherUser === 'object') {
        return `${otherUser.firstName} ${otherUser.lastName}`;
      }
    }
    const participantNames = conv.participants
      .filter((p: any) => normalizeId(p) !== normalizeId(currentUser?._id))
      .map((p: any) => (typeof p === 'object' ? `${p.firstName} ${p.lastName}` : ''))
      .filter(Boolean);

    if (participantNames.length > 0) {
      return participantNames.slice(0, 3).join(', ') + (participantNames.length > 3 ? '…' : '');
    }

    return conv.type === 'group' ? `Group (${conv.participants.length})` : `Chat (${conv.participants.length})`;
  };

  const getSenderName = (msg: Message) => {
    if (typeof msg.senderId === 'object') {
      return `${msg.senderId.firstName} ${msg.senderId.lastName}`;
    }
    const sender = conversations.flatMap((c) => c.participants).find((p) => normalizeId(p) === normalizeId(msg.senderId));
    if (sender && typeof sender === 'object') {
      return `${sender.firstName} ${sender.lastName}`;
    }
    return 'Unknown User';
  };

  const getSenderInitials = (msg: Message) => {
    if (typeof msg.senderId === 'object') {
      return `${msg.senderId.firstName[0]}${msg.senderId.lastName[0]}`;
    }
    const sender = conversations.flatMap((c) => c.participants).find((p) => normalizeId(p) === normalizeId(msg.senderId));
    if (sender && typeof sender === 'object') {
      return `${sender.firstName[0]}${sender.lastName[0]}`;
    }
    return 'U';
  };

  const isOwnMessage = (msg: Message) => {
    const senderId = normalizeId(msg.senderId);
    return currentUser ? senderId === normalizeId(currentUser._id) : false;
  };

  const startDirectChat = async (userId: string) => {
    try {
      const existing = conversations.find(c => c.type === 'direct' && c.participants.some((p: any) => normalizeId(p) === userId));
      if (existing) {
        setSelectedConversation(existing);
        return;
      }
      const conv = await chatApi.createConversation({ participantIds: [userId], type: 'direct' });
      setConversations(prev => dedupeConversations([conv, ...prev]));
      setSelectedConversation(conv);
    } catch (err) {
      console.error('Failed to start chat:', err);
      toast.error('Failed to start chat');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="rounded-xl overflow-hidden w-full max-w-4xl h-[600px] p-8">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Conversations List Sidebar */}
        <Card className="rounded-xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-6 border-b border-border">
            <h2 className="text-[18px] font-semibold">Messages</h2>
            {conversations.length > 0 && (
              <p className="text-[12px] text-muted-foreground mt-1">{conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 chat-scroll min-h-0">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Send className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-[14px] font-medium mb-1">No conversations yet</p>
                <p className="text-[12px] text-muted-foreground mb-4">Start chatting with your collaborators</p>
                <div className="space-y-2">
                  {allUsers.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-[12px] text-muted-foreground">No available users to chat</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Share a folder with someone to start chatting!</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-medium text-muted-foreground mb-3 text-left px-2">Available users:</p>
                      {allUsers.map((u: any) => (
                        <div key={u._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800/50 mx-2 mb-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-[12px]">
                                {u.firstName[0]}{u.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-[14px] font-medium">{u.firstName} {u.lastName}</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">{u.email}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="default" className="rounded-lg text-[12px] h-7 px-3" onClick={() => startDirectChat(u._id)}>
                            Chat
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => {
                  const convId = normalizeId(conv._id);
                  const unread = unreadCounts[convId] || 0;
                  const isSelected = normalizeId(selectedConversation?._id) === convId;
                  const otherParticipant = conv.participants.find((p: any) => normalizeId(p) !== normalizeId(currentUser?._id));
                  // Compute nicer avatar initials:
                  // 1) For direct chats: first letter of first & last name
                  // 2) For group chats or missing names: initials from conversation name
                  let participantName: string;
                  if (otherParticipant && typeof otherParticipant === 'object') {
                    const first = otherParticipant.firstName?.[0] || '';
                    const last = otherParticipant.lastName?.[0] || '';
                    participantName = (first + last || '').toUpperCase();
                  } else {
                    const convName = getConversationName(conv);
                    const initials = convName
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((word) => word[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    participantName = initials || 'C';
                  }

                  return (
                    <div
                      key={convId}
                      onClick={() => {
                        setSelectedConversation(conv);
                        setIsConversationsSheetOpen(false);
                      }}
                      className={`p-3 cursor-pointer transition-all ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600'
                        : 'hover:bg-white dark:hover:bg-gray-800/50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-[12px]">
                            {participantName}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-[14px] font-medium truncate ${isSelected ? 'text-blue-900 dark:text-blue-100' : ''}`}>
                              {getConversationName(conv)}
                            </p>
                            {unread > 0 && (
                              <Badge className="bg-blue-600 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-semibold ml-2">
                                {unread > 99 ? '99+' : unread}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[12px] text-muted-foreground truncate flex-1">
                              {conv.lastMessage?.content || 'No messages yet'}
                            </p>
                            {conv.lastActivity && (
                              <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                                {formatTime(conv.lastActivity)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Main Chat Area */}
        <Card className="lg:col-span-2 rounded-xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl lg:hidden"
                      onClick={() => setIsConversationsSheetOpen(true)}
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                        {getConversationName(selectedConversation)
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((word) => word[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-[18px] font-semibold">{getConversationName(selectedConversation)}</h3>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {selectedConversation.participants.length} {selectedConversation.participants.length === 1 ? 'participant' : 'participants'}
                        {onlineUsers.length > 0 && ` • ${onlineUsers.length} online`}
                      </p>
                    </div>
                  </div>
                  {onlineUsers.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-2">
                        {onlineUsers.slice(0, 3).map((user) => (
                          <div key={user._id} className="relative">
                            <Avatar className="w-7 h-7 border-2 border-white dark:border-card">
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-[10px]">
                                {user.firstName[0]}{user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-card bg-green-500" />
                          </div>
                        ))}
                      </div>
                      {onlineUsers.length > 3 && (
                        <span className="text-[11px] text-muted-foreground ml-1">+{onlineUsers.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages container: fixed area with internal scroll */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 chat-scroll"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <Send className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] font-medium mb-1">No messages yet</p>
                    <p className="text-[13px] text-muted-foreground">Start the conversation by sending a message below</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn = isOwnMessage(msg);
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const showAvatar = !isOwn && (!prevMsg || isOwnMessage(prevMsg) || normalizeId(prevMsg.senderId) !== normalizeId(msg.senderId));
                    const showName = !isOwn && (!prevMsg || isOwnMessage(prevMsg) || normalizeId(prevMsg.senderId) !== normalizeId(msg.senderId));

                    return (
                      <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${index > 0 ? 'mt-1' : ''}`}>
                        <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[75%] break-words`}>
                          {showAvatar ? (
                            <Avatar className="w-7 h-7 flex-shrink-0 mb-1">
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-[11px]">
                                {getSenderInitials(msg)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-7 flex-shrink-0" />
                          )}
                          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            {showName && (
                              <p className="text-[12px] font-medium text-muted-foreground mb-1 px-1">
                                {getSenderName(msg)}
                              </p>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl ${isOwn
                              ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-sm'
                              }`}>
                              <p className={`text-[14px] leading-relaxed whitespace-pre-wrap break-words ${isOwn ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                                }`}>
                                {msg.content}
                              </p>
                            </div>
                            <p className={`text-[11px] text-muted-foreground mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                              {formatMessageTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-border space-y-3">
                <div className="flex items-center space-x-2">
                  <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-xl flex-shrink-0" type="button">
                        <Smile className="w-5 h-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" sideOffset={8} align="start" className="w-[300px] p-2 rounded-xl z-50 shadow-lg border">
                      <div className="grid grid-cols-8 gap-1 auto-rows-auto">
                        {commonEmojis.map((emoji, idx) => (
                          <button
                            key={idx}
                            onClick={() => insertEmoji(emoji)}
                            className="text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer flex items-center justify-center w-9 h-9"
                            type="button"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl"
                  />
                  <Button onClick={handleSendMessage} className="rounded-xl" disabled={!message.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {message.trim() && (
                  <p className="text-[12px] text-muted-foreground">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Send className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-[20px] mb-2">Select a conversation</h2>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to start chatting
              </p>
            </div>
          )}
        </Card>

        {/* Online Users Sidebar */}
        <Card className="rounded-xl overflow-hidden flex flex-col h-[calc(100vh-12rem)] hidden lg:flex">
          <div className="p-6 border-b border-border">
            <h3 className="text-[18px] font-semibold">Online ({onlineUsers.length})</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 chat-scroll min-h-0">
            {onlineUsers.length === 0 ? (
              <p className="text-[14px] text-muted-foreground text-center mt-4">No online users in this conversation</p>
            ) : (
              onlineUsers.map((user) => (
                <div key={user._id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">{`${user.firstName[0]}${user.lastName[0]}`}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-card bg-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium">{`${user.firstName} ${user.lastName}`}</p>
                    <p className="text-[12px] text-muted-foreground capitalize">online</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Mobile Conversations Sheet */}
      <Sheet open={isConversationsSheetOpen} onOpenChange={setIsConversationsSheetOpen}>
        <SheetContent side="left" className="p-0 w-[320px] sm:w-[400px]">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>Messages</SheetTitle>
            {conversations.length > 0 && (
              <p className="text-[12px] text-muted-foreground mt-1">{conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}</p>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 chat-scroll">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Send className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-[14px] font-medium mb-1">No conversations yet</p>
                <p className="text-[12px] text-muted-foreground mb-4">Start chatting with your collaborators</p>
                <div className="space-y-2">
                  {allUsers.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-[12px] text-muted-foreground">No available users to chat</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Share a folder with someone to start chatting!</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-medium text-muted-foreground mb-3 text-left px-2">Available users:</p>
                      {allUsers.map((u: any) => (
                        <div key={u._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800/50 mx-2 mb-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-[12px]">
                                {u.firstName[0]}{u.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-[14px] font-medium">{u.firstName} {u.lastName}</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">{u.email}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="default" className="rounded-lg text-[12px] h-7 px-3" onClick={() => {
                            startDirectChat(u._id);
                            setIsConversationsSheetOpen(false);
                          }}>
                            Chat
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => {
                  const convId = normalizeId(conv._id);
                  const unread = unreadCounts[convId] || 0;
                  const isSelected = normalizeId(selectedConversation?._id) === convId;
                  const otherParticipant = conv.participants.find((p: any) => normalizeId(p) !== normalizeId(currentUser?._id));
                  let participantName: string;
                  if (otherParticipant && typeof otherParticipant === 'object') {
                    const first = otherParticipant.firstName?.[0] || '';
                    const last = otherParticipant.lastName?.[0] || '';
                    participantName = (first + last || '').toUpperCase();
                  } else {
                    const convName = getConversationName(conv);
                    const initials = convName
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((word) => word[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    participantName = initials || 'C';
                  }

                  return (
                    <div
                      key={convId}
                      onClick={() => {
                        setSelectedConversation(conv);
                        setIsConversationsSheetOpen(false);
                      }}
                      className={`p-3 cursor-pointer transition-all ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600'
                        : 'hover:bg-white dark:hover:bg-gray-800/50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-[12px]">
                            {participantName}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-[14px] font-medium truncate ${isSelected ? 'text-blue-900 dark:text-blue-100' : ''}`}>
                              {getConversationName(conv)}
                            </p>
                            {unread > 0 && (
                              <Badge className="bg-blue-600 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[11px] font-semibold ml-2">
                                {unread > 99 ? '99+' : unread}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[12px] text-muted-foreground truncate flex-1">
                              {conv.lastMessage?.content || 'No messages yet'}
                            </p>
                            {conv.lastActivity && (
                              <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                                {formatTime(conv.lastActivity)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
