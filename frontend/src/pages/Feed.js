import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { FriendsSidebar } from '../components/FriendsSidebar';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';
import { ThumbsUp, MessageCircle, Send, Image as ImageIcon, Trash2, Zap, Calendar, MapPin } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { hu } from 'date-fns/locale';

export const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [highlightedEvents, setHighlightedEvents] = useState([]);

  useEffect(() => {
    fetchPosts();
    fetchHighlightedEvents();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get('/posts/feed');
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const fetchHighlightedEvents = async () => {
    try {
      const response = await api.get('/events/highlighted');
      setHighlightedEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch highlighted events:', error);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Írj valamit!');
      return;
    }

    setLoading(true);
    try {
      await api.post('/posts', { content, image_base64: imageBase64 });
      setContent('');
      setImageBase64('');
      toast.success('Bejegyzés létrehozva!');
      fetchPosts();
    } catch (error) {
      toast.error('Hiba történt');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReact = async (postId) => {
    try {
      await api.post(`/posts/${postId}/react`, { reaction_type: 'like' });
      fetchPosts();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Biztosan törlöd?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      toast.success('Bejegyzés törölve');
      fetchPosts();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const loadComments = async (postId) => {
    try {
      const response = await api.get(`/posts/${postId}/comments`);
      setComments({ ...comments, [postId]: response.data });
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId];
    if (!text?.trim()) return;

    try {
      await api.post(`/posts/${postId}/comment`, { content: text });
      setCommentText({ ...commentText, [postId]: '' });
      loadComments(postId);
      fetchPosts();
      toast.success('Komment hozzáadva');
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const toggleComments = (postId) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      loadComments(postId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-8 space-y-8">
            <Card className="bg-zinc-900/50 border-white/5" data-testid="create-post-card">
              <CardHeader>
                <h2 className="font-chakra text-xl font-semibold uppercase text-white">Bejegyzés létrehozása</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <Textarea
                    data-testid="post-content-input"
                    placeholder="Mire gondolsz?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary/50 text-white placeholder:text-zinc-600 min-h-[100px]"
                  />
                  
                  {imageBase64 && (
                    <div className="relative">
                      <img src={imageBase64} alt="Preview" className="w-full rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setImageBase64('')}
                        className="absolute top-2 right-2 bg-red-500 p-2 rounded-full hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-sm transition-colors">
                        <ImageIcon className="w-5 h-5 text-zinc-400" />
                        <span className="text-sm text-zinc-400">Kép</span>
                      </div>
                    </label>
                    
                    <Button
                      data-testid="post-submit-button"
                      type="submit"
                      className="ml-auto font-chakra font-bold uppercase tracking-wider bg-primary hover:bg-orange-600"
                      disabled={loading}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {loading ? 'Közzététel...' : 'Közzététel'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {posts.map((post) => (
              <Card key={post.post_id} className="post-card bg-zinc-900/50 border-white/5" data-testid="post-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={post.profile_pic} />
                        <AvatarFallback className="bg-zinc-800 text-white">
                          {post.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white">{post.username}</p>
                        <p className="text-xs text-zinc-500">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: hu })}
                        </p>
                      </div>
                    </div>
                    
                    {(post.user_id === user?.user_id || user?.role === 1) && (
                      <button
                        onClick={() => handleDeletePost(post.post_id)}
                        className="text-zinc-500 hover:text-red-500"
                        data-testid="delete-post-button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-zinc-300 leading-relaxed">{post.content}</p>
                  
                  {post.image_base64 && (
                    <img src={post.image_base64} alt="Post" className="w-full rounded-lg" />
                  )}
                  
                  <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleReact(post.post_id)}
                      className="flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors"
                      data-testid="like-button"
                    >
                      <ThumbsUp className="w-5 h-5" />
                      <span className="text-sm font-semibold">{post.reaction_count}</span>
                    </button>
                    
                    <button
                      onClick={() => toggleComments(post.post_id)}
                      className="flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors"
                      data-testid="comment-button"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-semibold">{post.comment_count}</span>
                    </button>
                  </div>
                  
                  {expandedPost === post.post_id && (
                    <div className="space-y-3 pt-3 border-t border-white/5" data-testid="comment-section">
                      {comments[post.post_id]?.map((comment) => (
                        <div key={comment.comment_id} className="flex gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={comment.profile_pic} />
                            <AvatarFallback className="bg-zinc-800 text-white text-xs">
                              {comment.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-zinc-800/50 rounded-lg p-3">
                            <p className="text-sm font-semibold text-white">{comment.username}</p>
                            <p className="text-sm text-zinc-300 mt-1">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex gap-2">
                        <Textarea
                          data-testid="comment-input"
                          placeholder="Írj egy kommentet..."
                          value={commentText[post.post_id] || ''}
                          onChange={(e) => setCommentText({ ...commentText, [post.post_id]: e.target.value })}
                          className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 min-h-[60px]"
                        />
                        <Button
                          data-testid="comment-submit-button"
                          onClick={() => handleComment(post.post_id)}
                          size="sm"
                          className="bg-primary hover:bg-orange-600"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Right Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
            {/* Highlighted Events */}
            <Card className="bg-zinc-900/50 border-white/5 sticky top-20" data-testid="highlighted-events">
              <CardHeader>
                <h3 className="font-chakra text-lg font-bold uppercase text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Kiemelt Események
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {highlightedEvents.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">Nincs kiemelt esemény</p>
                ) : (
                  highlightedEvents.map((event) => (
                    <div
                      key={event.event_id}
                      className="p-4 bg-zinc-800/30 rounded-lg border-2 border-primary/30 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = '/events'}
                    >
                      {event.image_base64 && (
                        <img src={event.image_base64} alt={event.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                      )}
                      <h4 className="font-chakra text-base font-bold uppercase text-white mb-2">{event.title}</h4>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(event.date), 'MMM d.', { locale: hu })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400 text-xs">
                          <MapPin className="w-3 h-3" />
                          <span>{event.city}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Friends Sidebar */}
            <FriendsSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};
