import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { toast } from 'sonner';
import { Wallet as WalletIcon, Check, CreditCard } from 'lucide-react';

const PACKAGES = [
  { amount: 2000, label: '2 000 Ft' },
  { amount: 5000, label: '5 000 Ft' },
  { amount: 10000, label: '10 000 Ft' }
];

export const Wallet = () => {
  const { user, setUser } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState(5000);
  const [balance, setBalance] = useState(0);
  const [paymentRef, setPaymentRef] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchWalletData();
    fetchTransactions();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await api.get('/wallet/balance');
      setBalance(response.data.wallet_balance);
      setPaymentRef(response.data.unique_payment_reference);
      setUser({ ...user, wallet_balance: response.data.wallet_balance });
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/wallet/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleTopup = async () => {
    try {
      await api.post('/wallet/topup', {
        amount: selectedAmount,
        payment_method: 'paypal'
      });
      toast.success('Fizetési kérelem elküldve! Admin jóváhagyásra vár.');
      fetchTransactions();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Card className="bg-gradient-to-r from-primary to-orange-600 border-0 text-white" data-testid="balance-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wider opacity-90">Jelenlegi egyenleg</p>
                <p className="text-5xl font-bold font-chakra mt-2">{balance} Ft</p>
              </div>
              <WalletIcon className="w-16 h-16 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/5" data-testid="topup-card">
          <CardHeader>
            <h2 className="font-chakra text-2xl font-bold uppercase text-white">
              Válaszd ki az összeget
            </h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.amount}
                  data-testid={`package-${pkg.amount}`}
                  onClick={() => setSelectedAmount(pkg.amount)}
                  className={`relative p-6 rounded-lg border-2 transition-all ${
                    selectedAmount === pkg.amount
                      ? 'border-primary bg-primary/10'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                  }`}
                >
                  {selectedAmount === pkg.amount && (
                    <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <p className="font-chakra text-3xl font-bold text-white">{pkg.label}</p>
                  <p className="text-sm text-zinc-500 mt-1">Feltöltés</p>
                </button>
              ))}
            </div>

            <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-300">
                <CreditCard className="w-5 h-5" />
                <p className="font-semibold">PAYPAL FIZETÉS</p>
              </div>
              <p className="text-sm text-zinc-400">
                Biztonságos fizetés PayPal-lal.
              </p>
              <div className="mt-3 p-3 bg-zinc-900 rounded border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Közlemény:</p>
                <p className="font-mono text-primary font-bold text-lg">{paymentRef}</p>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                A PayPal és kártyás fizetések 24 órán belül kerülnek ellenőrzésre és jóváírásra.
              </p>
              <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded p-3">
                <p className="text-sm text-blue-400">
                  <strong>PayPal link:</strong>{' '}
                  <a
                    href="https://www.paypal.com/paypalme/chappystore?country.x=HU&locale.x=hu_HU"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-300"
                  >
                    https://www.paypal.com/paypalme/chappystore
                  </a>
                </p>
                <p className="text-xs text-blue-300 mt-2">
                  Kérjük add meg a fenti közleményt az utalásnál!
                </p>
              </div>
            </div>

            <Button
              data-testid="topup-submit-button"
              onClick={handleTopup}
              className="w-full font-chakra font-bold uppercase tracking-wider bg-primary hover:bg-orange-600 text-lg py-6"
            >
              <WalletIcon className="w-5 h-5 mr-2" />
              Feltöltés: {selectedAmount} Ft
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader>
            <h2 className="font-chakra text-2xl font-bold uppercase text-white">
              Miért töltsem fel az egyenlegem?
            </h2>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Kiemelt események létrehozása (2000 Ft/hét)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Az eseményed a lista tetején jelenik meg</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span>Sárga kerettel kiemelt megjelenítés</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader>
            <h2 className="font-chakra text-2xl font-bold uppercase text-white">
              Tranzakciók
            </h2>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">Még nincsenek tranzakciók</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.payment_id}
                    className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg"
                    data-testid="transaction-item"
                  >
                    <div>
                      <p className="text-white font-semibold">{tx.amount} Ft</p>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">
                        {tx.payment_method}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          tx.status === 'approved'
                            ? 'bg-green-500/20 text-green-500'
                            : tx.status === 'rejected'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}
                      >
                        {tx.status === 'approved' ? 'Jóváhagyva' : tx.status === 'rejected' ? 'Elutasítva' : 'Függőben'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
