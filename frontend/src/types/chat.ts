/**
 * Chat-related type definitions
 */

export interface ChatUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

export interface ChatParticipant {
  id: number;
  user: ChatUser;
  joined_at: string;
  last_read_at: string | null;
}

export interface MessageReaction {
  id: number;
  message: number;
  user: ChatUser;
  emoji: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  room: number;
  user: ChatUser;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  is_system: boolean;
  attachment: string | null;
  attachment_url: string | null;
  attachment_name: string;
  attachment_size: number | null;
  reactions: MessageReaction[];
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatRoom {
  id: number;
  name: string;
  type: 'direct' | 'group' | 'ticket';
  project: number;
  participants: ChatParticipant[];
  created_by: ChatUser | null;
  last_message: ChatMessage | null;
  unread_count: number;
  display_name: string;
  // Ticket chat fields (only for type='ticket')
  ticket_id?: number | null;
  ticket_key?: string | null;
  ticket_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatRoomCreate {
  name?: string;
  type: 'direct' | 'group' | 'ticket';
  project: number;
  participant_ids: number[];
  ticket_id?: number;  // For creating ticket chat rooms
}

export interface ChatMessageCreate {
  room: number;
  content: string;
  type?: 'text' | 'image' | 'file';
  attachment?: File;
}

export interface ChatMessageUpdate {
  content: string;
}

// WebSocket event types
export interface WSChatEvent {
  type: 'message_new' | 'message_edited' | 'message_deleted' |
  'reaction_added' | 'reaction_removed' | 'user_typing' |
  'user_joined' | 'user_left';
}

export interface WSMessageNew extends WSChatEvent {
  type: 'message_new';
  message: ChatMessage;
}

export interface WSMessageEdited extends WSChatEvent {
  type: 'message_edited';
  message: ChatMessage;
}

export interface WSMessageDeleted extends WSChatEvent {
  type: 'message_deleted';
  message_id: number;
}

export interface WSReactionAdded extends WSChatEvent {
  type: 'reaction_added';
  reaction: MessageReaction;
}

export interface WSReactionRemoved extends WSChatEvent {
  type: 'reaction_removed';
  message_id: number;
  user_id: number;
  emoji: string;
}

export interface WSUserTyping extends WSChatEvent {
  type: 'user_typing';
  user_id: number;
  username: string;
  is_typing: boolean;
}

export interface WSUserJoined extends WSChatEvent {
  type: 'user_joined';
  user_id: number;
  username: string;
}

export interface WSUserLeft extends WSChatEvent {
  type: 'user_left';
  user_id: number;
  username: string;
}

export type ChatWebSocketEvent =
  | WSMessageNew
  | WSMessageEdited
  | WSMessageDeleted
  | WSReactionAdded
  | WSReactionRemoved
  | WSUserTyping
  | WSUserJoined
  | WSUserLeft;
