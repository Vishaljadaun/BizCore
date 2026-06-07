import { useState, useEffect, useRef } from 'react';
import { useForm }           from 'react-hook-form';
import { zodResolver }       from '@hookform/resolvers/zod';
import { z }                 from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError }        from 'axios';
import { authApi }           from '../../api/authApi';
import { useAuthStore }      from '../../store/authStore';
import Input                 from '../../components/shared/Input';
import Button                from '../../components/shared/Button';

// ── Zod Schema ─────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ── LoginPage ──────────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate                        = useNavigate();
  const login                           = useAuthStore((state) => state.login);
  const [serverError,  setServerError]  = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // ── Canvas refs ──────────────────────────────────────────────────────────
  const canvasRef        = useRef<HTMLCanvasElement | null>(null);
  const mouseRef         = useRef({ x: -1000, y: -1000, active: false });
  const shockwaveRef     = useRef({ x: 0, y: 0, radius: 0, active: false, color: '#06b6d4' });
  const hudRef           = useRef({ text: 'BIZCORE_AUTH_GATEWAY_ONLINE', opacity: 1.2 });
  const particleCountRef = useRef(90);
  const speedRef         = useRef(1.1);

  // ── Canvas animation ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let particles: any[] = [];
    let tenantHubs: any[] = [];

    const resizeCanvas = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width  = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      tenantHubs = [
        { name: 'AUTH_NODE_ALPHA',  x: w * 0.18, y: h * 0.25, color: 'rgba(236,72,153,',   pulse: 0,  maxPulse: 35 },
        { name: 'AUTH_NODE_BETA',   x: w * 0.82, y: h * 0.32, color: 'rgba(99,102,241,',   pulse: 12, maxPulse: 35 },
        { name: 'AUTH_NODE_GAMMA',  x: w * 0.50, y: h * 0.80, color: 'rgba(168,85,247,',   pulse: 24, maxPulse: 35 },
      ];
    };

    const onMouseMove  = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY, active: true }; };
    const onMouseLeave = ()              => { mouseRef.current = { x: -1000, y: -1000, active: false }; };

    window.addEventListener('resize',    resizeCanvas);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    resizeCanvas();

    const draw = () => {
      const w = canvas.width  / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      const speed  = speedRef.current;
      const target = particleCountRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Background trail
      ctx.fillStyle = 'rgba(2,6,23,0.22)';
      ctx.fillRect(0, 0, w, h);

      // Blueprint grid
      ctx.strokeStyle = 'rgba(30,41,59,0.25)';
      ctx.lineWidth   = 1;
      const gap = 120;
      for (let x = 0; x < w; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Populate particles
      while (particles.length < target) {
        const isEmp = Math.random() > 0.55;
        particles.push({
          type:        isEmp ? 'employee' : 'inventory',
          x:           Math.random() * w,
          y:           Math.random() * h,
          vx:          (Math.random() - 0.5) * 1.6,
          vy:          (Math.random() - 0.5) * 1.6,
          radius:      isEmp ? 2.5 : 4,
          color:       isEmp ? 'rgba(168,85,247,' : 'rgba(6,182,212,',
          alpha:       Math.random() * 0.5 + 0.5,
          angle:       Math.random() * Math.PI * 2,
          spin:        (Math.random() - 0.5) * 0.04,
          empId:       `USR_${String(Math.floor(Math.random() * 90) + 10)}`,
          tenantIndex: Math.floor(Math.random() * 3),
        });
      }
      if (particles.length > target) particles.splice(target);

      // Shockwave
      if (shockwaveRef.current.active) {
        const sw = shockwaveRef.current;
        sw.radius += 20 * speed;
        if (sw.radius > 700) {
          sw.active = false;
        } else {
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = sw.color;
          ctx.lineWidth   = 5 * (1 - sw.radius / 700);
          ctx.stroke();
        }
      }

      // Tenant hubs
      tenantHubs.forEach((hub) => {
        hub.pulse = (hub.pulse + 0.45) % hub.maxPulse;
        const g = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, 45);
        g.addColorStop(0, hub.color + '0.25)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(hub.x, hub.y, 45, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hub.x, hub.y, hub.pulse + 15, 0, Math.PI * 2);
        ctx.strokeStyle = hub.color + (1 - hub.pulse / hub.maxPulse) * 0.45 + ')';
        ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(hub.x, hub.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = hub.color + '0.95)'; ctx.fill();
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(203,213,225,0.75)';
        ctx.fillText(hub.name, hub.x - 45, hub.y - 14);
      });

      // Particles
      particles.forEach((p, idx) => {
        // Shockwave push
        if (shockwaveRef.current.active) {
          const sw  = shockwaveRef.current;
          const d   = Math.hypot(p.x - sw.x, p.y - sw.y);
          if (Math.abs(d - sw.radius) < 40) {
            const a = Math.atan2(p.y - sw.y, p.x - sw.x);
            p.x += Math.cos(a) * 7 * speed;
            p.y += Math.sin(a) * 7 * speed;
          }
        }
        // Steer to hub
        const hub = tenantHubs[p.tenantIndex];
        if (hub) {
          const dx = hub.x - p.x, dy = hub.y - p.y;
          const d  = Math.hypot(dx, dy) || 1;
          if (d > 100) { p.vx += (dx / d) * 0.02 * speed; p.vy += (dy / d) * 0.02 * speed; }
        }
        // Mouse attraction line
        if (mx > 0 && my > 0) {
          const dm = Math.hypot(p.x - mx, p.y - my);
          if (dm < 220) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(34,211,238,${(1 - dm / 220) * 0.12})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }

        if (p.type === 'inventory') {
          if (idx % 2 === 0) { p.x += 1.35 * speed; p.y += Math.sin(p.x * 0.01) * 0.15; }
          else               { p.y += 1.35 * speed; p.x += Math.cos(p.y * 0.01) * 0.15; }
          if (p.x > w + 10) p.x = -10;
          if (p.y > h + 10) p.y = -10;
          ctx.strokeStyle = p.color + p.alpha + ')'; ctx.lineWidth = 1;
          ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color + '1.0)'; ctx.fill();
        } else {
          p.angle += p.spin * speed;
          p.x += Math.cos(p.angle) * 0.75 * speed;
          p.y += Math.sin(p.angle) * 0.75 * speed;
          if (p.x < 10 || p.x > w - 10) p.spin *= -1;
          if (p.y < 10 || p.y > h - 10) p.spin *= -1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - Math.cos(p.angle) * 11, p.y - Math.sin(p.angle) * 11);
          ctx.strokeStyle = p.color + '0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color + '0.9)'; ctx.fill();
          ctx.font = '8px monospace';
          ctx.fillStyle = 'rgba(203,213,225,0.45)';
          ctx.fillText(p.empId, p.x + 8, p.y + 3);
          for (let j = idx + 1; j < particles.length; j++) {
            const p2 = particles[j];
            if (p2.type === 'inventory') {
              const dt = Math.hypot(p.x - p2.x, p.y - p2.y);
              if (dt < 85) {
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(168,85,247,${(1 - dt / 85) * 0.25})`;
                ctx.lineWidth = 0.8; ctx.stroke();
              }
            }
          }
        }
      });

      // HUD
      if (hudRef.current.opacity > 0) {
        ctx.save();
        ctx.font        = 'bold 11px monospace';
        ctx.fillStyle   = `rgba(34,211,238,${Math.min(hudRef.current.opacity, 1)})`;
        ctx.shadowColor = 'rgba(34,211,238,0.5)';
        ctx.shadowBlur  = 8;
        ctx.fillText(`BIZCORE_AUTH >> ${hudRef.current.text}`, 24, h - 24);
        ctx.restore();
        hudRef.current.opacity -= 0.012;
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize',    resizeCanvas);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  // Shockwave on background click
  const handleBgClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, button, form, a')) return;
    shockwaveRef.current = { x: e.clientX, y: e.clientY, radius: 0, active: true, color: '#22d3ee' };
    hudRef.current = {
      text:    `ACCESS_POINT_PING_[${Math.floor(e.clientX)},${Math.floor(e.clientY)}]`,
      opacity: 1.5,
    };
  };

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver:      zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      const response = await authApi.login(data);
      login(response);
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(error.response?.data?.message || 'Login failed. Please try again.');
      } else {
        setServerError('Network error. Please check your connection.');
      }
    }
  };

  return (
    <div
      onClick={handleBgClick}
      className="relative min-h-screen bg-slate-950 flex items-center
        justify-center p-4 overflow-hidden select-none"
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none z-10
        bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)]
        bg-[size:4rem_4rem]
        [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]
        opacity-20" />

      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[550px] h-[550px] rounded-full
        bg-indigo-500/10 blur-[135px] pointer-events-none z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] rounded-full
        bg-cyan-500/10 blur-[135px] pointer-events-none z-10 animate-pulse" />

      {/* ── Card ── */}
      <div className="relative z-20 w-full max-w-md">

        {/* Top cyan accent line */}
        <div className="h-[3px] rounded-full opacity-85
          bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-0" />

        <div className="bg-slate-900/40 border border-slate-800/80
          rounded-3xl p-8 sm:p-10 backdrop-blur-2xl
          transition-all duration-500
          hover:border-indigo-500/30">

          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center
              w-16 h-16 rounded-2xl mb-4 relative overflow-hidden group
              bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500
              shadow-lg shadow-indigo-500/30">
              {/* Shimmer effect */}
              <div className="absolute inset-0
                bg-gradient-to-r from-transparent via-white/30 to-transparent
                -translate-x-full group-hover:translate-x-full
                transition-transform duration-1000 ease-out" />
              <svg className="w-9 h-9 text-white drop-shadow animate-pulse"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h8a4 4 0 0 0 0-8H4v16h9a4 4 0 0 0 0-8H4" />
              </svg>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight
              bg-gradient-to-r from-white via-slate-100 to-slate-400
              bg-clip-text text-transparent">
              BIZCORE GATEWAY
            </h1>
            <p className="text-slate-400 mt-2 text-xs tracking-widest uppercase font-mono">
              Unified Enterprise Access Portal
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="bg-rose-500/10 border border-rose-500/30
              rounded-xl p-4 mb-6 flex items-start gap-3">
              <span className="text-rose-400 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-rose-200 text-xs leading-relaxed font-mono">
                {serverError}
              </p>
            </div>
          )}

          {/* Form — your existing logic, zero changes */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
            noValidate
          >
            <Input
              label="Email Address"
              type="email"
              placeholder="john@company.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-10 p-1
                  text-slate-400 hover:text-cyan-400 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
                      a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12
                      4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3
                      0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            <div className="flex justify-end -mt-3">
              <Link
                to="/forgot-password"
                className="text-xs text-cyan-400 hover:text-cyan-300
                  hover:underline font-mono tracking-wider transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Glowing submit button */}
            <div className="relative group/btn mt-2">
              <div className="absolute -inset-1 rounded-xl blur opacity-30
                group-hover/btn:opacity-60 transition duration-300 pointer-events-none
                bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />
              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isSubmitting}
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-slate-600 text-[10px] font-mono tracking-widest">
              OR
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Register link */}
          <p className="text-center text-xs text-slate-400 tracking-wider font-mono">
            No account yet?{' '}
            <Link
              to="/register"
              className="text-cyan-400 font-bold hover:text-cyan-300
                hover:underline transition-colors uppercase"
            >
              Register your company
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom-right live telemetry widget */}
      <div className="fixed bottom-6 right-6 z-30
        bg-slate-900/95 border border-slate-800
        rounded-2xl p-4 w-72 backdrop-blur-xl
        shadow-2xl hover:border-cyan-500/30 transition-all
        hidden lg:block">
        <div className="flex items-center gap-2 mb-3
          border-b border-slate-800 pb-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full
              rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5
              rounded-full bg-cyan-500" />
          </span>
          <h4 className="text-[10px] font-bold tracking-widest
            text-cyan-400 uppercase">
            BizCore Live Telemetry
          </h4>
        </div>

        <div className="flex flex-col gap-1.5 text-[10px] font-mono
          bg-slate-950 rounded-xl p-2.5 border border-slate-800">
          <div className="flex justify-between">
            <span className="text-slate-500">🔐 Auth Nodes:</span>
            <span className="text-pink-400 font-bold">3 SECURE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">📦 Data Streams:</span>
            <span className="text-cyan-400 font-bold">ACTIVE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">👥 Sessions:</span>
            <span className="text-purple-400 font-bold">MONITORED</span>
          </div>
        </div>

        <p className="text-[9px] text-slate-600 font-mono mt-2.5
          text-center leading-relaxed">
          Click anywhere on the background to emit a sync shockwave
        </p>
      </div>
    </div>
  );
};

export default LoginPage;