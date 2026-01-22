import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  message,
  Spin,
  Avatar,
  Input,
} from "antd";
import {
  SendOutlined,
  PaperClipOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  MoreOutlined
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { ChatRoom, ChatMessage } from "../types/chat";
import { chatService } from "../services/chat.service";
import { webSocketService } from "../services/websocket.service";

const { TextArea } = Input;

interface TicketChatPanelProps {
  ticketId: number;
}

const TicketChatPanel: React.FC<TicketChatPanelProps> = ({ ticketId }) => {
  const { user } = useAuth();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageCursor, setMessageCursor] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wsPathRef = useRef<string | null>(null);
  const oldScrollHeightRef = useRef<number>(0);

  useEffect(() => {
    if (ticketId) {
      loadChatRoom();
    }
    return () => disconnectWebSocket();
  }, [ticketId]);

  useEffect(() => {
    if (!chatRoom?.id) return;
    connectWebSocket();
    return () => disconnectWebSocket();
  }, [chatRoom?.id]);

  // Handle scroll for infinite history loading
  const handleScroll = () => {
    if (!messagesContainerRef.current || loadingOlder || !hasMoreMessages) return;
    
    // If scrolled to near top (top 50px)
    if (messagesContainerRef.current.scrollTop < 50) {
      loadOlderMessages();
    }
  };

  // Maintain scroll position after loading older messages
  useEffect(() => {
    if (messagesContainerRef.current && oldScrollHeightRef.current > 0) {
        const newScrollHeight = messagesContainerRef.current.scrollHeight;
        const scrollDiff = newScrollHeight - oldScrollHeightRef.current;
        messagesContainerRef.current.scrollTop = scrollDiff;
        oldScrollHeightRef.current = 0;
    }
  }, [messages]);

  // Scroll to bottom on initial load or new message (if near bottom)
  useEffect(() => {
      // Only auto-scroll to bottom if we are not loading older messages
      if (!loadingOlder && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
  }, [messages.length, loadingOlder]);


  const disconnectWebSocket = () => {
    if (wsPathRef.current) {
        webSocketService.disconnect(wsPathRef.current);
        wsPathRef.current = null;
    }
  }

  const connectWebSocket = () => {
    if (!chatRoom?.id) return;

    const wsPath = `ws/chat/${chatRoom.id}/`;
    wsPathRef.current = wsPath;

    webSocketService.connect(
      wsPath,
      handleWebSocketMessage,
      (error) => console.error("WebSocket error:", error),
      () => console.log("Chat connected")
    );
    
    // Initial load
    loadMessages();
  };

  const loadChatRoom = async () => {
    try {
      setMessagesLoading(true);
      setMessages([]);
      
      let room: ChatRoom | null = null;
      try {
        room = await chatService.getTicketChatRoom(ticketId);
      } catch (err: any) {
        const isNotFound = err?.response?.status === 404 || err?.status === 404;
        const isForbidden = err?.message === 'Permission Denied' || err?.response?.status === 403 || err?.status === 403;
        if (!isNotFound && !isForbidden) throw err;
      }

      if (!room) {
        try {
            room = await chatService.createTicketChatRoom(ticketId);
        } catch (createErr: any) {
            console.error("Failed to create chat room:", createErr);
            if (createErr.message === 'Permission Denied') {
                 message.error("You don't have permission to start a chat for this ticket.");
            } else {
                 message.error("Failed to initialize conversation.");
            }
            return;
        }
      }
      setChatRoom(room);
    } catch (err) {
      console.error("Failed to load chat room:", err);
      message.error("Failed to load conversation");
    } finally {
        setMessagesLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!chatRoom?.id) return;
    setMessagesLoading(true);
    try {
      const result = await chatService.getMessages(chatRoom.id, { limit: 20 });
      setMessages(result.messages);
      setHasMoreMessages(result.hasMore);
      setMessageCursor(result.cursor);
      
      // Scroll to bottom after initial load
      setTimeout(() => {
         messagesEndRef.current?.scrollIntoView();
      }, 100);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!chatRoom?.id || !messageCursor) return;
    
    // Save current scroll height to restore position later
    if (messagesContainerRef.current) {
        oldScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
    }

    setLoadingOlder(true);
    try {
      const result = await chatService.getMessages(chatRoom.id, { 
          limit: 20, 
          before: messageCursor 
      });
      
      if (result.messages.length > 0) {
          setMessages(prev => [...result.messages, ...prev]);
          setHasMoreMessages(result.hasMore);
          setMessageCursor(result.cursor);
      } else {
          setHasMoreMessages(false);
      }
    } catch (err) {
      console.error("Failed to load older history:", err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    if (data.type === "message_new" && data.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    } else if (data.type === "message_deleted" && data.message_id) {
      setMessages((prev) => prev.filter((m) => m.id !== data.message_id));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !chatRoom?.id) return;

    try {
      setSending(true);
      await chatService.sendMessage({
        room: chatRoom.id,
        content: newMessage.trim(),
        type: "text",
      });
      setNewMessage("");
    } catch (error: any) {
      message.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center z-10 sticky top-0">
        <div>
           <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
             Discussion
             <span className="flex h-2.5 w-2.5 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
             </span>
           </h3>
           <p className="text-xs text-slate-400 mt-0.5">Real-time collaboration</p>
        </div>
        <Button icon={<MoreOutlined />} type="text" className="text-slate-400 hover:text-slate-600" />
      </div>

      {/* Chat Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 bg-white p-6 overflow-y-auto custom-scrollbar"
      >
        {loadingOlder && (
            <div className="flex justify-center mb-6">
                 <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
            </div>
        )}
        
        {messagesLoading && messages.length === 0 ? (
            <div className="flex justify-center py-20">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} tip="Loading..." />
            </div>
        ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                <InfoCircleOutlined className="text-4xl mb-4" />
                <p>No messages yet. Say hello!</p>
            </div>
        ) : (
            <div className="space-y-4 pb-4">
               {messages.map(msg => {
                  const isMe = msg.user?.id === user?.id; // Assuming user.id available
                  const isSystem = msg.is_system || msg.type === "system";

                  if (isSystem) return (
                     <div key={msg.id} className="text-center text-xs text-slate-400 my-6 flex items-center justify-center gap-2">
                        <span className="h-px w-6 bg-slate-100"></span>
                        <span>{msg.content}</span>
                        <span className="text-slate-300">•</span>
                        <span>{formatTime(msg.created_at)}</span>
                        <span className="h-px w-6 bg-slate-100"></span>
                     </div>
                  );
                  
                  return (
                     <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-2`}>
                        {!isMe && (
                           <Avatar 
                               size="small" 
                               className="mb-1 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm"
                           >
                               {msg.user?.first_name?.[0] || msg.user?.username?.[0] || "?"}
                           </Avatar>
                        )}
                        <div className="flex flex-col max-w-[75%]">
                            {!isMe && (
                                <span className="text-[10px] text-slate-500 ml-1 mb-1">{msg.user?.username}</span>
                            )}
                            <div className={`px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap ${
                                isMe 
                                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-none' 
                                    : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-none'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity self-center mb-2">
                           {formatTime(msg.created_at)}
                        </div>
                     </div>
                  );
               })}
               <div ref={messagesEndRef} />
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
         <div className="flex gap-2 bg-slate-50 p-1.5 rounded-3xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-200 transition-all items-end">
            <div className="flex gap-1 pb-1 pl-1">
                <Button type="text" shape="circle" icon={<PaperClipOutlined />} className="text-slate-400 hover:text-blue-500 hover:bg-blue-50" />
                {/* Emoji button could go here */}
            </div>
            
            <TextArea 
                placeholder="Type a message..." 
                autoSize={{ minRows: 1, maxRows: 5 }}
                className="bg-transparent border-none shadow-none focus:shadow-none p-2 text-sm text-slate-700 placeholder:text-slate-400 !resize-none"
                style={{ marginBottom: 0 }}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
            />
            
            <div className="pb-1 pr-1">
                <Button 
                    type="primary" 
                    shape="circle" 
                    icon={<SendOutlined />} 
                    className={`${newMessage.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'} border-none shadow-sm transition-colors`}
                    onClick={handleSendMessage}
                    loading={sending}
                    disabled={!newMessage.trim()}
                />
            </div>
         </div>
         <div className="text-center mt-2 opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-slate-300">Press Enter to send</span>
         </div>
      </div>
    </div>
  );
};

export default TicketChatPanel;
