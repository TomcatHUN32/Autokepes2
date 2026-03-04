import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Search, UserPlus, UserCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const UserSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/users/search/${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await api.post(`/friends/request?to_user_id=${userId}`);
      toast.success('Ismerős kérés elküldve!');
      // Update local state to show pending status
      setSearchResults(prev => prev.map(user => 
        user.user_id === userId ? { ...user, friendship_status: 'pending' } : user
      ));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hiba történt');
    }
  };

  const renderFriendButton = (user) => {
    switch (user.friendship_status) {
      case 'self':
        return null;
      case 'accepted':
        return (
          <span className="flex items-center gap-1 text-xs text-green-500 px-2 py-1 bg-green-500/10 rounded">
            <UserCheck className="w-4 h-4" />
            Ismerős
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-500 px-2 py-1 bg-yellow-500/10 rounded">
            <Clock className="w-4 h-4" />
            Függőben
          </span>
        );
      default:
        return (
          <Button
            size="sm"
            onClick={() => handleAddFriend(user.user_id)}
            className="bg-primary hover:bg-orange-600"
            data-testid="add-friend-search-button"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          data-testid="search-users-button"
        >
          <Search className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-chakra text-xl uppercase">Felhasználók keresése</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Keresés felhasználónév alapján..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
            data-testid="search-input"
          />

          {loading && (
            <p className="text-sm text-zinc-500 text-center py-4">Keresés...</p>
          )}

          {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">Nincs találat</p>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <button
                  onClick={() => {
                    navigate(`/profile/${user.user_id}`);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 flex-1"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.profile_pic} />
                    <AvatarFallback className="bg-zinc-700 text-white">
                      {user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{user.username}</p>
                  </div>
                </button>
                {renderFriendButton(user)}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
