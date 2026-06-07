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
const registerSchema = z
  .object({
    companyName: z
      .string()
      .min(2,   'Company name must be at least 2 characters')
      .max(200, 'Company name is too long'),

    firstName: z
      .string()
      .min(1,   'First name is required')
      .max(100, 'First name is too long'),

    lastName: z
      .string()
      .min(1,   'Last name is required')
      .max(100, 'Last name is too long'),

    email: z
      .string()
      .min(1,   'Email is required')
      .email('Please enter a valid email address'),

    password: z
      .string()
      .min(8,   'Password must be at least 8 characters')
      .regex(/[A-Z]/,         'Must contain at least one uppercase letter')
      .regex(/[a-z]/,         'Must contain at least one lowercase letter')
      .regex(/[0-9]/,         'Must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),

    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path:    ['confirmPassword'],
    }
  );

type RegisterFormData = z.infer<typeof registerSchema>;

// ── Password strength ──────────────────────────────────────────────────────
const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8)           score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[a-z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak',   color: 'bg-red-400',    width: 'w-1/5' };
  if (score <= 3) return { label: 'Fair',   color: 'bg-yellow-400', width: 'w-3/5' };
  return           { label: 'Strong', color: 'bg-green-500',  width: 'w-full' };
};

// ── Particle canvas hook ───────────────────────────────────────────────────
function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number; c: string; a: number;
    }

    const particles: Particle[] = [];
    let raf: number;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = [
      'rgba(99,102,241,',
      'rgba(6,182,212,',
      'rgba(168,85,247,',
      'rgba(236,72,153,',
    ];

    // 120 nodes — more than login page
    for (let i = 0; i < 120; i++) {
      particles.push({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.6,  // faster speed
        vy: (Math.random() - 0.5) * 1.6,
        r:  Math.random() * 2.5 + 1,
        c:  colors[Math.floor(Math.random() * colors.length)],
        a:  Math.random() * 0.55 + 0.2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c + p.a + ')';
        ctx.fill();

        // Draw connecting lines — slightly longer reach (140px)
        for (let j = i + 1; j < particles.length; j++) {
          const dist = Math.hypot(p.x - particles[j].x, p.y - particles[j].y);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${(1 - dist / 140) * 0.2})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      });

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef]);
}

// ── Component ──────────────────────────────────────────────────────────────
const RegisterPage = () => {
  const navigate                        = useNavigate();
  const login                           = useAuthStore((state) => state.login);
  const canvasRef                       = useRef<HTMLCanvasElement | null>(null);
  const [serverError,  setServerError]  = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useParticleCanvas(canvasRef);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue    = watch('password', '');
  const passwordStrength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError(null);
      const { confirmPassword: _, ...registerData } = data;
      const response = await authApi.register(registerData);
      login(response);
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message || 'Registration failed. Please try again.'
        );
      } else {
        setServerError('Network error. Please check your connection.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617]
      flex items-center justify-center p-4 py-10 relative overflow-hidden">

      {/* ── Particle Canvas ── */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* ── Ambient glow blobs ── */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full
        bg-indigo-500/10 blur-[100px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 rounded-full
        bg-cyan-500/8 blur-[90px] pointer-events-none z-0" />
      <div className="fixed top-3/4 left-3/4 w-64 h-64 rounded-full
        bg-purple-500/8 blur-[80px] pointer-events-none z-0" />

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-lg">

        {/* Top accent line */}
        <div className="h-[2px] mx-[20%] rounded-full
          bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-0" />

        <div className="bg-slate-900/75 border border-indigo-500/20
          rounded-2xl p-8 backdrop-blur-xl">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center
              w-14 h-14 rounded-[14px] mb-4
              bg-gradient-to-br from-indigo-500 to-cyan-500">
              <svg
                className="w-7 h-7 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12h8a4 4 0 0 0 0-8H4v16h9a4 4 0 0 0 0-8H4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Get started with BizCore
            </h1>
            <p className="text-slate-500 mt-1 text-xs tracking-widest font-mono uppercase">
              Free trial — no credit card required
            </p>
          </div>

          {/* Server Error */}
          {serverError && (
            <div className="bg-red-500/10 border border-red-500/30
              rounded-xl p-3 mb-6 flex items-start gap-2">
              <span className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-red-300 text-xs font-mono leading-relaxed">
                {serverError}
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            {/* Company Name */}
            <Input
              label="Company Name"
              placeholder="Acme Corporation"
              error={errors.companyName?.message}
              {...register('companyName')}
            />

            {/* First + Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="John"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="Smith"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            {/* Email */}
            <Input
              label="Business Email"
              type="email"
              placeholder="john@company.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Password + strength */}
            <div className="flex flex-col gap-1">
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.password?.message}
                  helperText="Min 8 chars, uppercase, lowercase, number, special character"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-slate-500
                    hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
                        a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1
                        12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19
                        m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
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

              {/* Password Strength Bar */}
              {passwordValue.length > 0 && (
                <div className="mt-1">
                  <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`
                        h-full rounded-full transition-all duration-300
                        ${passwordStrength.color}
                        ${passwordStrength.width}
                      `}
                    />
                  </div>
                  <p className={`text-xs mt-1 font-medium font-mono ${
                    passwordStrength.label === 'Strong'
                      ? 'text-green-400'
                      : passwordStrength.label === 'Fair'
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}>
                    Password strength: {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {/* Terms */}
            <p className="text-xs text-slate-500 text-center font-mono">
              By registering you agree to our{' '}
              <a href="#" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="#" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">
                Privacy Policy
              </a>
            </p>

            {/* Submit button with glow */}
            <div className="relative group">
              <div className="absolute -inset-[2px] rounded-xl
                bg-gradient-to-r from-indigo-500 to-cyan-500
                opacity-25 blur-sm
                group-hover:opacity-50 transition-opacity duration-300
                pointer-events-none" />
              <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
                Create Account
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-indigo-500/15" />
            <span className="text-slate-600 text-[10px] font-mono tracking-widest">OR</span>
            <div className="flex-1 h-px bg-indigo-500/15" />
          </div>

          {/* Login link */}
          <p className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-cyan-400 font-semibold font-mono
                hover:text-cyan-300 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;