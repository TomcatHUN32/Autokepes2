import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ChatWindow } from './ChatWindow';
import { toast } from 'sonner';

export const FriendsSidebar = () => {
  const { user } = useAuth();
  const socketRef = useSocket();
  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openChats, setOpenChats] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});

  useEffect(() => {
    fetchFriends();
    fetchUnreadCounts();
  }, []);

  useEffect(() => {
    if (socketRef?.current) {
      socketRef.current.on('receive_message', (data) => {
        // Check if message is from a friend and chat is not open
        const isChatOpen = openChats.find((f) => f.user_id === data.from_user_id);
        
        if (data.to_user_id === user.user_id && !isChatOpen) {
          // Increment unread count
          setUnreadMessages((prev) => ({
            ...prev,
            [data.from_user_id]: (prev[data.from_user_id] || 0) + 1,
          }));

          // Show notification
          const sender = friends.find((f) => f.user_id === data.from_user_id);
          if (sender) {
            const messagePreview = data.content.startsWith('[IMAGE]') 
              ? '📷 Kép' 
              : data.content.substring(0, 50);
            toast.info(`${sender.username}: ${messagePreview}`, {
              duration: 3000,
              action: {
                label: 'Megnyitás',
                onClick: () => openChat(sender),
              },
            });
          }
        }
      });

      return () => {
        socketRef.current.off('receive_message');
      };
    }
  }, [socketRef, friends, openChats, user]);

  const fetchFriends = async () => {
    try {
      const response = await api.get('/friends/list');
      const friendsList = Array.isArray(response.data) ? response.data : [];
      setFriends(friendsList);
      setFilteredFriends(friendsList);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
      setFriends([]);
      setFilteredFriends([]);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const response = await api.get('/friends/list');
      const friendsList = Array.isArray(response.data) ? response.data : [];
      const counts = {};
      
      // For each friend, get unread message count
      for (const friend of friendsList) {
        try {
          const messages = await api.get(`/messages/${friend.user_id}`);
          const messagesList = Array.isArray(messages.data) ? messages.data : [];
          const unread = messagesList.filter(
            (msg) => !msg.read_status && msg.from_user_id === friend.user_id
          ).length;
          if (unread > 0) {
            counts[friend.user_id] = unread;
          }
        } catch (err) {
          console.error(`Failed to fetch messages for ${friend.user_id}:`, err);
        }
      }
      
      setUnreadMessages(counts);
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  };

  const openChat = (friend) => {
    if (!openChats.find((f) => f.user_id === friend.user_id)) {
      setOpenChats([...openChats, friend]);
      // Clear unread count when opening chat
      setUnreadMessages((prev) => {
        const newCounts = { ...prev };
        delete newCounts[friend.user_id];
        return newCounts;
      });
    }
  };

  const closeChat = (friendId) => {
    setOpenChats(openChats.filter((f) => f.user_id !== friendId));
  };

  const handleMessageRead = (friendId) => {
    setUnreadMessages((prev) => {
      const newCounts = { ...prev };
      delete newCounts[friendId];
      return newCounts;
    });
  };

  const handleSearchFriends = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter((friend) =>
        friend.username.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  };

  return (
    <>
      <Card className="bg-zinc-900/50 border-white/5 sticky top-20" data-testid="friends-sidebar">
        <CardHeader>
          <h3 className="font-chakra text-lg font-bold uppercase text-white mb-2">Ismerősök</h3>
          <Input
            type="text"
            placeholder="Keresés..."
            value={searchQuery}
            onChange={(e) => handleSearchFriends(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 text-sm"
            data-testid="friends-search-input"
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredFriends.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              {searchQuery ? 'Nincs találat' : 'Nincs ismerős'}
            </p>
          ) : (
            filteredFriends.slice(0, 8).map((friend) => (
              <button
                key={friend.user_id}
                onClick={() => openChat(friend)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors text-left relative"
                data-testid="friend-item"
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.profile_pic} />
                    <AvatarFallback className="bg-zinc-800 text-white text-sm">
                      {friend.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {friend.online_status === 'online' && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{friend.username}</p>
                  <p className="text-xs text-zinc-500">
                    {friend.online_status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
                {unreadMessages[friend.user_id] > 0 && (
                  <div className="bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {unreadMessages[friend.user_id]}
                  </div>
                )}
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Chat Windows */}
      <div className="fixed bottom-0 right-0 flex gap-4 pr-4 z-50 flex-wrap justify-end">
        {openChats.map((friend, index) => (
          <div key={friend.user_id} className="mb-0">
            <ChatWindow
              friend={friend}
              onClose={() => closeChat(friend.user_id)}
              unreadCount={unreadMessages[friend.user_id] || 0}
              onMessageRead={() => handleMessageRead(friend.user_id)}
            />
          </div>
        ))}
      </div>
    </>
  );
};
