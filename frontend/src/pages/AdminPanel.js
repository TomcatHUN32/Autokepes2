import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Users, FileText, Calendar, DollarSign, Check, X, Trash2, Shield, Mail, MailCheck } from 'lucide-react';

export const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (user?.role !== 1) {
      window.location.href = '/feed';
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    try {
      const [usersRes, eventsRes, paymentsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/events'),
        api.get('/admin/payments')
      ]);
      setUsers(usersRes.data);
      setEvents(eventsRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Biztosan törlöd ezt a felhasználót?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('Felhasználó törölve');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role?role=${role}`);
      toast.success('Role frissítve');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleVerifyEmail = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/verify-email`);
      toast.success('Email megerősítve');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Biztosan törlöd ezt az eseményt?')) return;
    try {
      await api.delete(`/admin/events/${eventId}`);
      toast.success('Esemény törölve');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleApproveEvent = async (eventId) => {
    try {
      await api.put(`/admin/events/${eventId}/approve`);
      toast.success('Esemény jóváhagyva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleRejectEvent = async (eventId) => {
    try {
      await api.put(`/admin/events/${eventId}/reject`);
      toast.success('Esemény elutasítva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleApproveHighlight = async (eventId) => {
    try {
      await api.put(`/admin/events/${eventId}/highlight-approve`);
      toast.success('Kiemelés jóváhagyva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleRejectHighlight = async (eventId) => {
    try {
      await api.put(`/admin/events/${eventId}/highlight-reject`);
      toast.success('Kiemelés elutasítva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      await api.put(`/admin/payments/${paymentId}/approve`);
      toast.success('Fizetés jóváhagyva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleRejectPayment = async (paymentId) => {
    try {
      await api.put(`/admin/payments/${paymentId}/reject`);
      toast.success('Fizetés elutasítva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  if (user?.role !== 1) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-10 h-10 text-primary" />
          <h1 className="font-chakra text-4xl font-bold uppercase text-white" data-testid="admin-heading">
            Admin Panel
          </h1>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-zinc-900 border border-white/10 p-1">
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Felhasználók
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-events">
              <Calendar className="w-4 h-4 mr-2" />
              Események
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-payments">
              <DollarSign className="w-4 h-4 mr-2" />
              Fizetések
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white">
                  Felhasználók kezelése
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((u) => (
                    <div
                      key={u.user_id}
                      className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg"
                      data-testid="user-item"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold">{u.username}</p>
                          {u.email_verified ? (
                            <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                              <MailCheck className="w-3 h-3" />
                              Megerősítve
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                              <Mail className="w-3 h-3" />
                              Nincs megerősítve
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!u.email_verified && (
                          <Button
                            onClick={() => handleVerifyEmail(u.user_id)}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            data-testid="verify-email-button"
                          >
                            <MailCheck className="w-4 h-4 mr-1" />
                            Megerősít
                          </Button>
                        )}
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.user_id, parseInt(e.target.value))}
                          className="bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-1 text-sm"
                          data-testid="user-role-select"
                        >
                          <option value={0}>User</option>
                          <option value={1}>Admin</option>
                        </select>
                        <Button
                          onClick={() => handleDeleteUser(u.user_id)}
                          size="sm"
                          variant="destructive"
                          data-testid="delete-user-button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white">
                  Események jóváhagyása
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.filter(e => e.status === 'pending').map((event) => (
                    <div
                      key={event.event_id}
                      className="p-4 bg-zinc-800/30 rounded-lg space-y-3"
                      data-testid="event-approval-item"
                    >
                      <div>
                        <p className="text-white font-bold">{event.title}</p>
                        <p className="text-sm text-zinc-400 mt-1">{event.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">Szerző: {event.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproveEvent(event.event_id)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          data-testid="approve-event-button"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Jóváhagy
                        </Button>
                        <Button
                          onClick={() => handleRejectEvent(event.event_id)}
                          size="sm"
                          variant="destructive"
                          data-testid="reject-event-button"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Elutasít
                        </Button>
                        <Button
                          onClick={() => handleDeleteEvent(event.event_id)}
                          size="sm"
                          variant="destructive"
                          data-testid="delete-event-button"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Törlés
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* All Events Section */}
                  <div className="mt-8">
                    <h3 className="font-chakra text-lg font-bold uppercase text-white mb-4">
                      Összes esemény
                    </h3>
                    {events.map((event) => (
                      <div
                        key={event.event_id}
                        className="p-4 bg-zinc-800/30 rounded-lg space-y-3 mb-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-white font-bold">{event.title}</p>
                            <p className="text-sm text-zinc-400 mt-1">{event.description}</p>
                            <p className="text-xs text-zinc-500 mt-1">Szerző: {event.username}</p>
                            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              event.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                              event.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                              'bg-yellow-500/20 text-yellow-500'
                            }`}>
                              {event.status === 'approved' ? 'Jóváhagyva' : event.status === 'rejected' ? 'Elutasítva' : 'Függőben'}
                            </span>
                          </div>
                          <Button
                            onClick={() => handleDeleteEvent(event.event_id)}
                            size="sm"
                            variant="destructive"
                            data-testid="delete-all-event-button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {events.filter(e => e.highlighted_pending).length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-chakra text-lg font-bold uppercase text-white mb-4">
                        Kiemelési kérelmek
                      </h3>
                      {events.filter(e => e.highlighted_pending).map((event) => (
                        <div
                          key={event.event_id}
                          className="p-4 bg-zinc-800/30 rounded-lg space-y-3 mb-3"
                        >
                          <div>
                            <p className="text-white font-bold">{event.title}</p>
                            <p className="text-xs text-zinc-500 mt-1">Szerző: {event.username}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApproveHighlight(event.event_id)}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Kiemelés jóváhagyása
                            </Button>
                            <Button
                              onClick={() => handleRejectHighlight(event.event_id)}
                              size="sm"
                              variant="destructive"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Kiemelés elutasítása
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white">
                  Fizetések jóváhagyása
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.filter(p => p.status === 'pending').map((payment) => (
                    <div
                      key={payment.payment_id}
                      className="p-4 bg-zinc-800/30 rounded-lg space-y-3"
                      data-testid="payment-approval-item"
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="text-white font-bold">{payment.amount} Ft</p>
                          <p className="text-sm text-zinc-400 mt-1">Felhasználó: {payment.username}</p>
                          <p className="text-xs text-zinc-500 mt-1">Közlemény: {payment.unique_reference}</p>
                        </div>
                        <div>
                          <span className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded text-xs uppercase tracking-wider">
                            {payment.payment_method}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprovePayment(payment.payment_id)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          data-testid="approve-payment-button"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Jóváhagy
                        </Button>
                        <Button
                          onClick={() => handleRejectPayment(payment.payment_id)}
                          size="sm"
                          variant="destructive"
                          data-testid="reject-payment-button"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Elutasít
                        </Button>
                      </div>
                    </div>
                  ))}
                  {payments.filter(p => p.status === 'pending').length === 0 && (
                    <p className="text-zinc-500 text-center py-8">Nincsenek függőben lévő fizetések</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
