import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { User, Camera, Edit, UserPlus, UserCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [editData, setEditData] = useState({
    bio: '',
    profile_pic: '',
    cover_pic: ''
  });
  const isOwnProfile = currentUser?.user_id === userId;

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
    fetchFriends();
    if (!isOwnProfile && userId) {
      checkFriendshipStatus();
    }
  }, [userId, isOwnProfile]);

  const checkFriendshipStatus = async () => {
    try {
      const response = await api.get(`/friends/status/${userId}`);
      setFriendshipStatus(response.data.status);
    } catch (error) {
      console.error('Failed to check friendship status:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      setProfile(response.data);
      if (isOwnProfile) {
        setEditData({
          bio: response.data.bio || '',
          profile_pic: response.data.profile_pic || '',
          cover_pic: response.data.cover_pic || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await api.get(`/posts/user/${userId}`);
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await api.get('/friends/list');
      setFriends(response.data.slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A kép maximum 5MB lehet!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, [type]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await api.put('/users/profile', editData);
      toast.success('Profil frissítve!');
      setShowEditDialog(false);
      fetchProfile();
      
      if (isOwnProfile) {
        setUser({ ...currentUser, ...editData });
      }
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Card className="bg-zinc-900/50 border-white/5 overflow-hidden" data-testid="profile-card">
          {/* Cover Photo + Profile Picture Overlay */}
          <div className="relative">
            {/* Cover Photo */}
            <div className="h-48 md:h-80 bg-gradient-to-r from-zinc-800 to-zinc-900">
              {profile?.cover_pic && (
                <img src={profile.cover_pic} alt="Cover" className="w-full h-full object-cover" />
              )}
              {isOwnProfile && (
                <label className="absolute top-4 right-4 p-2 bg-zinc-900/80 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          try {
                            await api.put('/users/profile', { cover_pic: reader.result });
                            toast.success('Borítókép frissítve!');
                            fetchProfile();
                          } catch (error) {
                            toast.error('Hiba történt');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <Camera className="w-5 h-5 text-white" />
                </label>
              )}
            </div>

            {/* Profile Picture - Bottom Left Corner */}
            <div className="absolute bottom-4 left-4 md:left-8">
              <div className="relative">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background">
                  <AvatarImage src={profile?.profile_pic} />
                  <AvatarFallback className="bg-zinc-800 text-white text-5xl">
                    {profile?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <label className="absolute bottom-0 right-0 p-2 bg-zinc-900 rounded-full border-2 border-background hover:bg-zinc-800 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            try {
                              await api.put('/users/profile', { profile_pic: reader.result });
                              toast.success('Profilkép frissítve!');
                              fetchProfile();
                            } catch (error) {
                              toast.error('Hiba történt');
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <Camera className="w-4 h-4 text-white" />
                  </label>
                )}
              </div>
            </div>

            {/* Stats - Bottom Center */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
              <p className="text-3xl font-bold text-white">{posts.length}</p>
              <p className="text-sm text-zinc-400 uppercase tracking-wider">Bejegyzés</p>
            </div>

            {/* Edit Button - Bottom Right */}
            {isOwnProfile ? (
              <div className="absolute bottom-4 right-4 md:right-8">
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-orange-600 font-chakra uppercase tracking-wider shadow-orange-glow" data-testid="edit-profile-button">
                      <Edit className="w-4 h-4 mr-2" />
                      Szerkesztés
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-chakra text-2xl uppercase">Profil szerkesztése</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-zinc-400 uppercase text-xs tracking-wider">Bio</Label>
                        <Textarea
                          value={editData.bio}
                          onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                          className="bg-zinc-950 border-zinc-800 text-white min-h-[100px]"
                          placeholder="Írj magadról..."
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400 uppercase text-xs tracking-wider">Profilkép</Label>
                        <div className="flex items-center gap-4">
                          {editData.profile_pic && (
                            <img src={editData.profile_pic} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
                          )}
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile_pic')} className="hidden" />
                            <div className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-sm transition-colors text-sm">
                              Kép kiválasztása
                            </div>
                          </label>
                        </div>
                      </div>
                      <div>
                        <Label className="text-zinc-400 uppercase text-xs tracking-wider">Borítókép</Label>
                        <div className="space-y-2">
                          {editData.cover_pic && (
                            <img src={editData.cover_pic} alt="Cover" className="w-full h-32 rounded-lg object-cover" />
                          )}
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover_pic')} className="hidden" />
                            <div className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-sm transition-colors text-sm inline-block">
                              Kép kiválasztása
                            </div>
                          </label>
                        </div>
                      </div>
                      <Button onClick={handleSaveProfile} className="w-full bg-primary hover:bg-orange-600 font-chakra uppercase">
                        Mentés
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="absolute bottom-4 right-4 md:right-8">
                {friendshipStatus === 'accepted' ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <UserCheck className="w-5 h-5 text-green-500" />
                    <span className="font-chakra uppercase tracking-wider text-green-500">Ismerős</span>
                  </div>
                ) : friendshipStatus === 'pending' ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <span className="font-chakra uppercase tracking-wider text-yellow-500">Függőben</span>
                  </div>
                ) : (
                  <Button 
                    className="bg-primary hover:bg-orange-600 font-chakra uppercase tracking-wider" 
                    data-testid="add-friend-button"
                    onClick={async () => {
                      try {
                        await api.post(`/friends/request?to_user_id=${userId}`);
                        toast.success('Ismerős kérés elküldve!');
                        setFriendshipStatus('pending');
                      } catch (error) {
                        toast.error(error.response?.data?.detail || 'Hiba történt');
                      }
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Ismerős jelölés
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Profile Info Below Cover */}
          <CardContent className="pt-6">
            <div className="mb-6">
              <h1 className="font-chakra text-3xl font-bold uppercase text-white mb-2">
                {profile?.username}
              </h1>
              {profile?.bio && (
                <p className="text-zinc-400 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Posts Section */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="font-chakra text-2xl font-bold uppercase text-white">Bejegyzések</h2>
            {posts.length === 0 ? (
              <Card className="bg-zinc-900/50 border-white/5">
                <CardContent className="py-12 text-center">
                  <p className="text-zinc-500">Még nincsenek bejegyzések</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.post_id} className="bg-zinc-900/50 border-white/5">
                  <CardContent className="pt-6">
                    <p className="text-zinc-300 leading-relaxed">{post.content}</p>
                    {post.image_base64 && (
                      <img src={post.image_base64} alt="Post" className="w-full rounded-lg mt-4" />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Friends Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-zinc-900/50 border-white/5 sticky top-20">
              <CardContent className="pt-6">
                <h3 className="font-chakra text-lg font-bold uppercase text-white mb-4">Ismerősök</h3>
                {friends.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">Nincs ismerős</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {friends.map((friend) => (
                      <button
                        key={friend.user_id}
                        onClick={() => navigate(`/profile/${friend.user_id}`)}
                        className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                      >
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={friend.profile_pic} />
                          <AvatarFallback className="bg-zinc-800 text-white text-sm">
                            {friend.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs text-zinc-300 text-center truncate w-full">{friend.username}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
