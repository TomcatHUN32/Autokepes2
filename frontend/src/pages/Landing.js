import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

export const Landing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'success') {
      toast.success('Email sikeresen megerősítve! Most már bejelentkezhetsz.');
      navigate('/login?verified=success');
    } else if (verified === 'error') {
      toast.error('Érvénytelen megerősítési link.');
    }
  }, [searchParams, navigate]);

  if (showAuth) {
    navigate('/login');
  }

  return (
    <div className="min-h-screen">
      <div
        className="hero-section"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1758956928707-053c043a7b07?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwzfHx0dW5lZCUyMHNwb3J0cyUyMGNhciUyMG5pZ2h0JTIwY2l0eSUyMHN0cmVldHxlbnwwfHx8fDE3NzI1NTE1Mzl8MA&ixlib=rb-4.1.0&q=85)',
        }}
      >
        <div className="hero-overlay" />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_motorist-net/artifacts/2gvxxjuk_download.jpg" 
            alt="TuningTalálkozó Logo" 
            className="w-24 h-24 mb-8 rounded-full object-cover shadow-orange-glow-lg"
          />
          
          <h1 className="font-chakra text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-6">
            <span className="text-white">TUNING</span>
            <br />
            <span className="text-primary">TALÁLKOZÓ</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed">
            Csatlakozz a magyar tuning közösséghez! Fedezd fel a legizgalmasabb
            találkozókat, versenyeket és rendezvényeket.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              data-testid="join-button"
              size="lg"
              className="font-chakra font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-orange-600 shadow-orange-glow hover:shadow-orange-glow-lg transition-all duration-200 px-8"
              onClick={() => navigate('/register')}
            >
              <Zap className="w-5 h-5 mr-2" />
              Csatlakozom
            </Button>
            <Button
              data-testid="login-button"
              size="lg"
              variant="outline"
              className="font-chakra font-bold uppercase tracking-wider bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 px-8"
              onClick={() => navigate('/login')}
            >
              Bejelentkezés
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
