import { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, MapPin, DollarSign, Plus, Check, X, Zap, Upload, Image, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';

export const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    city: '',
    entry_fee: 0,
    is_official: false,
    image_base64: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nem támogatott fájlformátum. Engedélyezett: jpg, png, gif, webp');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A fájl mérete maximum 5MB lehet');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await api.post('/upload/event-image', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImagePreview(response.data.image_url);
      setUploadedFilename(response.data.filename);
      setFormData(prev => ({ ...prev, image_base64: response.data.image_url }));
      toast.success('Kép feltöltve!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hiba a feltöltés során');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (uploadedFilename) {
      try {
        await api.delete(`/upload/event-image/${uploadedFilename}`);
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    }
    setImagePreview(null);
    setUploadedFilename(null);
    setFormData(prev => ({ ...prev, image_base64: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      city: '',
      entry_fee: 0,
      is_official: false,
      image_base64: ''
    });
    setImagePreview(null);
    setUploadedFilename(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/events', formData);
      toast.success('Esemény létrehozva! Admin jóváhagyásra vár.');
      setShowCreateDialog(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleRSVP = async (eventId, status) => {
    try {
      await api.post(`/events/${eventId}/rsvp`, { status });
      toast.success('RSVP rögzítve');
      fetchEvents();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleHighlight = async (eventId) => {
    if (!window.confirm('2000 Ft-ba kerül a kiemelés. Folytatod?')) return;
    try {
      await api.post(`/events/${eventId}/highlight`);
      toast.success('Kiemelési kérelem elküldve!');
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hiba történt');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
          <h1 className="font-chakra text-4xl font-bold uppercase text-white" data-testid="events-heading">
            Események
          </h1>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-orange-600 font-chakra uppercase tracking-wider" data-testid="create-event-button">
                <Plus className="w-4 h-4 mr-2" />
                Új esemény
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-chakra text-2xl uppercase">Esemény létrehozása</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <Label className="text-zinc-400 uppercase text-xs tracking-wider">Cím</Label>
                  <Input
                    data-testid="event-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 uppercase text-xs tracking-wider">Leírás</Label>
                  <Textarea
                    data-testid="event-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="bg-zinc-950 border-zinc-800 text-white min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400 uppercase text-xs tracking-wider">Dátum</Label>
                    <Input
                      data-testid="event-date-input"
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="bg-zinc-950 border-zinc-800 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 uppercase text-xs tracking-wider">Város</Label>
                    <Input
                      data-testid="event-city-input"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      className="bg-zinc-950 border-zinc-800 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-400 uppercase text-xs tracking-wider">Belépő (Ft)</Label>
                  <Input
                    data-testid="event-fee-input"
                    type="number"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: parseFloat(e.target.value) })}
                    required
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_official"
                    data-testid="event-official-checkbox"
                    checked={formData.is_official}
                    onChange={(e) => setFormData({ ...formData, is_official: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <Label htmlFor="is_official" className="text-zinc-400">Bejelentett esemény?</Label>
                </div>
                
                {/* Image Upload Section */}
                <div>
                  <Label className="text-zinc-400 uppercase text-xs tracking-wider">Esemény képe (opcionális)</Label>
                  <div className="mt-2">
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={`${process.env.REACT_APP_BACKEND_URL}${imagePreview}`} 
                          alt="Feltöltött kép" 
                          className="w-full h-48 object-cover rounded-lg border border-zinc-800"
                          data-testid="event-image-preview"
                        />
                        <Button
                          type="button"
                          onClick={handleRemoveImage}
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700"
                          data-testid="remove-image-button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        className={`border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        data-testid="image-upload-area"
                      >
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-zinc-400 text-sm">Feltöltés...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                                <Image className="w-6 h-6 text-zinc-400" />
                              </div>
                              <span className="text-zinc-400 text-sm">Kattints vagy húzd ide a képet</span>
                              <span className="text-zinc-500 text-xs">Max 5MB (jpg, png, gif, webp)</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      data-testid="event-image-input"
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-primary hover:bg-orange-600 font-chakra uppercase" data-testid="event-submit-button">
                  Létrehozás
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {events.map((event) => (
            <Card
              key={event.event_id}
              className={`bg-zinc-900/50 border-white/5 overflow-hidden ${
                event.highlighted ? 'ring-2 ring-primary shadow-orange-glow' : ''
              }`}
              data-testid="event-card"
            >
              {event.image_base64 && (
                <img 
                  src={event.image_base64.startsWith('/api/') 
                    ? `${process.env.REACT_APP_BACKEND_URL}${event.image_base64}` 
                    : event.image_base64
                  } 
                  alt={event.title} 
                  className="w-full h-48 object-cover" 
                  data-testid="event-card-image"
                />
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <h3 className="font-chakra text-xl font-bold uppercase text-white">
                    {event.title}
                  </h3>
                  {event.highlighted && (
                    <div className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded-full">
                      <Zap className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">Kiemelt</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 mt-2">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(event.date), 'yyyy. MMM d. HH:mm', { locale: hu })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{event.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span>{event.entry_fee} Ft</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-zinc-300 text-sm leading-relaxed">{event.description}</p>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-500 font-semibold">{event.going_count} megy</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-red-500 font-semibold">{event.not_going_count} nem megy</span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRSVP(event.event_id, 'going')}
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-green-500/10 hover:bg-green-500/20 border-green-500/50 text-green-500"
                    data-testid="rsvp-going-button"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Ott leszek
                  </Button>
                  <Button
                    onClick={() => handleRSVP(event.event_id, 'not_going')}
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 border-red-500/50 text-red-500"
                    data-testid="rsvp-not-going-button"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Nem leszek ott
                  </Button>
                </div>
                
                {event.user_id === user?.user_id && !event.highlighted && !event.highlighted_pending && event.status === 'approved' && (
                  <Button
                    onClick={() => handleHighlight(event.event_id)}
                    size="sm"
                    className="w-full bg-primary hover:bg-orange-600 font-chakra uppercase"
                    data-testid="highlight-event-button"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Kiemelés (2000 Ft)
                  </Button>
                )}
                
                {event.highlighted_pending && (
                  <div className="text-center text-sm text-yellow-500 bg-yellow-500/10 py-2 rounded">
                    Kiemelés jóváhagyásra vár
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
