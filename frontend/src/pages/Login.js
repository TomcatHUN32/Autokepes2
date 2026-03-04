import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'success') {
      setVerificationSuccess(true);
      toast.success('Email sikeresen megerősítve! Most már bejelentkezhetsz.');
    } else if (verified === 'error') {
      toast.error('Érvénytelen megerősítési link.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Sikeres bejelentkezés!');
      navigate('/feed');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hibás email vagy jelszó');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div
        className="hidden md:block auth-bg"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1771931108145-f961735d24dc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHx1bmRlcmdyb3VuZCUyMHBhcmtpbmclMjBsb3QlMjBkYXJrJTIwbW9vZHxlbnwwfHx8fDE3NzI1NTE1Mzl8MA&ixlib=rb-4.1.0&q=85)',
        }}
      />
      
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_motorist-net/artifacts/2gvxxjuk_download.jpg" 
              alt="Logo" 
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h2 className="font-chakra text-2xl font-bold uppercase tracking-tight text-white">
                Tuning<span className="text-primary">Találkozó</span>
              </h2>
            </div>
          </div>

          <div>
            <h1 className="font-chakra text-3xl font-bold uppercase tracking-tight text-white mb-2" data-testid="login-heading">
              Bejelentkezés
            </h1>
            <p className="text-base text-zinc-400">
              Üdv újra! Jelentkezz be a fiókodba.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            {verificationSuccess && (
              <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Email megerősítve! Jelentkezz be a fiókodba.</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-zinc-400 uppercase tracking-wider">
                Email cím
              </Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                placeholder="pelda@email.hu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-sm text-white placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-zinc-400 uppercase tracking-wider">
                Jelszó
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-sm text-white placeholder:text-zinc-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              data-testid="login-submit-button"
              type="submit"
              className="w-full font-chakra font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-orange-600 shadow-orange-glow hover:shadow-orange-glow-lg transition-all duration-200"
              disabled={loading}
            >
              {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-zinc-500">
              Még nincs fiókod?{' '}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Regisztrálj itt
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
