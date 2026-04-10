import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Credentials are required');
      return;
    }

    try {
      setLoading(true);
      const user = await login(email.trim(), password);
      toast.success(`Access Granted: Welcome, ${user.name}`);
      navigate(user.role === 'admin' ? '/admin' : '/teacher');
    } catch (error) {
      toast.error(error?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/20">
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-16 overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3 animate-in fade-in slide-in-from-left duration-700">
          <div className="bg-white p-2 rounded-2xl shadow-2xl">
            <img src="/outr.png" alt="Logo" className="h-10 w-10 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">मूल्यांकन</h1>
            <p className="text-[10px] text-white/50 font-bold tracking-[0.2em] uppercase">OUTR Bhubaneswar</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-8">
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase">
              Student Performance Analysis & Reporting System
            </span>
            <h2 className="text-6xl font-bold leading-[1.1] tracking-tight text-white">
              The future of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-emerald-400">
                Performance Tracking.
              </span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed max-w-md">
              A precise analytics engine for CO-PO mapping and student academic reporting, built for modern educators.
            </p>
          </div>

          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
            {[
              'Real-time Outcome Analytics',
              'Automated Academic Audits',
              'Secure Faculty Access',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300 group cursor-default">
                <div className="h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-8 text-slate-500 text-xs font-medium uppercase tracking-widest">
          <span>Built for Excellence</span>
          <span>© 2026 OUTR</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 sm:px-12 bg-card relative overflow-hidden">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />

        <div className="w-full max-w-[430px] space-y-6 animate-in fade-in zoom-in-95 duration-700 relative z-10 mx-auto">
          <div className="text-center space-y-2">
            <div className="lg:hidden flex justify-center mb-6">
              <img src="/outr.png" alt="Logo" className="h-16 w-16 drop-shadow-md" />
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-foreground">Sign In</h3>
            <p className="text-muted-foreground">Enter your credentials to access the portal</p>
          </div>

          <Card className="border border-border/60 bg-background/70 backdrop-blur-sm shadow-xl shadow-primary/[0.06] rounded-2xl">
            <CardContent className="px-7 py-6 sm:px-10 sm:py-7">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                      Work Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@outr.ac.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl bg-muted/40 border border-border/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                      Password
                    </Label>
                    <div className="relative group">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl bg-muted/40 border border-border/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200 pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 uppercase tracking-widest text-xs">
                      Login
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="pt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">Authorized Personnel Only</span>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl border border-primary/15 bg-primary/[0.04] flex items-start gap-4">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-snug">
                Your session is encrypted with 256-bit security. Please log out after completing your tasks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
