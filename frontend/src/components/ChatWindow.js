import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { X, Minus, Send, Image as ImageIcon, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';
import { toast } from 'sonner';

export const ChatWindow = ({ friend, onClose, unreadCount, onMessageRead }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch messages on mount and poll every 3 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [friend]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/messages/${friend.user_id}`);
      const newMessages = Array.isArray(response.data) ? response.data : [];
      setMessages(newMessages);
      onMessageRead?.();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A kép maximum 5MB lehet!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !imageBase64) return;

    const messageContent = imageBase64 ? `[IMAGE]${imageBase64}` : newMessage;

    try {
      await api.post('/messages/send', {
        to_user_id: friend.user_id,
        content: messageContent,
      });
      setNewMessage('');
      setImageBase64('');
      fetchMessages(); // Refresh messages immediately
    } catch (error) {
      toast.error('Nem sikerült elküldeni az üzenetet');
    }
  };

  const renderMessageContent = (content) => {
    if (content.startsWith('[IMAGE]')) {
      const imageData = content.substring(7);
      return <img src={imageData} alt="Shared" className="max-w-full rounded-lg mt-1" />;
    }
    return <p className="text-sm">{content}</p>;
  };

  return (
    <div className={`chat-window ${minimized ? 'minimized' : ''}`} data-testid="chat-window">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-zinc-800 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={friend.profile_pic} />
            <AvatarFallback className="bg-zinc-700 text-white text-xs">
              {friend.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-white">{friend.username}</p>
            <p className="text-xs text-zinc-500">
              {friend.online_status === 'online' ? (
                <span className="text-green-500">● Online</span>
              ) : (
                <span>Offline</span>
              )}
            </p>
          </div>
          {unreadCount > 0 && !minimized && (
            <div className="ml-2 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMinimized(!minimized)}
            className="text-zinc-400 hover:text-white transition-colors"
            data-testid="minimize-chat-button"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            data-testid="close-chat-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.message_id}
                className={`flex ${msg.from_user_id === user.user_id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`message-bubble ${
                    msg.from_user_id === user.user_id ? 'own' : 'other'
                  }`}
                >
                  {renderMessageContent(msg.content)}
                  <p className="text-xs opacity-70 mt-1">
                    {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: hu })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-zinc-800 border-t border-white/10">
            {imageBase64 && (
              <div className="relative mb-2">
                <img src={imageBase64} alt="Preview" className="w-20 h-20 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => setImageBase64('')}
                  className="absolute -top-2 -right-2 bg-red-500 p-1 rounded-full hover:bg-red-600"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <label className="cursor-pointer flex items-center justify-center">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <div className="p-2 bg-zinc-900 hover:bg-zinc-700 rounded transition-colors">
                  <ImageIcon className="w-4 h-4 text-zinc-400" />
                </div>
              </label>
              <Input
                data-testid="chat-message-input"
                type="text"
                placeholder="Üzenet írása..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 text-sm"
              />
              <Button
                data-testid="chat-send-button"
                type="submit"
                size="sm"
                className="bg-primary hover:bg-orange-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
