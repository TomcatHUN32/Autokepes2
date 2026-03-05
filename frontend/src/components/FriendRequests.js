import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Bell, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export const FriendRequests = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open]);

  useEffect(() => {
    // Fetch on mount to show badge count
    fetchRequests();
    
    // Poll every 30 seconds for new requests
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/friends/pending');
      // Biztosítsuk, hogy mindig tömböt kapunk
      setRequests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
      setRequests([]);
    }
  };

  const handleAccept = async (requestId) => {
    setLoading(true);
    try {
      await api.put(`/friends/accept/${requestId}`);
      toast.success('Ismerős elfogadva!');
      fetchRequests();
    } catch (error) {
      toast.error('Hiba történt');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    setLoading(true);
    try {
      await api.put(`/friends/reject/${requestId}`);
      toast.success('Ismerős kérés elutasítva');
      fetchRequests();
    } catch (error) {
      toast.error('Hiba történt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 relative"
          data-testid="friend-requests-button"
        >
          <Bell className="w-5 h-5" />
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-chakra text-xl uppercase">Ismerős kérések</DialogTitle>
        </DialogHeader>
        
        {requests.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">Nincs függőben lévő kérés</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {requests.map((request) => (
              <div
                key={request.request_id}
                className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg"
                data-testid="friend-request-item"
              >
                <button
                  onClick={() => {
                    navigate(`/profile/${request.from_user_id}`);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 flex-1"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={request.profile_pic} />
                    <AvatarFallback className="bg-zinc-700 text-white">
                      {request.from_username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{request.from_username}</p>
                    <p className="text-xs text-zinc-500">Ismerősnek jelölt</p>
                  </div>
                </button>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(request.request_id)}
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600"
                    data-testid="accept-friend-button"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReject(request.request_id)}
                    disabled={loading}
                    variant="destructive"
                    data-testid="reject-friend-button"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
