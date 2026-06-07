import { useState }          from 'react';
import { useForm }           from 'react-hook-form';
import { zodResolver }       from '@hookform/resolvers/zod';
import { z }                 from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError }        from 'axios';
import { authApi }           from '../../api/authApi';
import { useAuthStore }      from '../../store/authStore';
import Input                 from '../../components/shared/Input';
import Button                from '../../components/shared/Button';

// ── Zod Schema ────────────────────────────────────────────────────────────
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
      .regex(/[A-Z]/,          'Must contain at least one uppercase letter')
      .regex(/[a-z]/,          'Must contain at least one lowercase letter')
      .regex(/[0-9]/,          'Must contain at least one number')
      .regex(/[^a-zA-Z0-9]/,  'Must contain at least one special character'),

    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    // .refine() = cross-field validation
    // Checks a condition that involves multiple fields
    {
      message: 'Passwords do not match',
      path:    ['confirmPassword'],
      // path tells Zod which field to attach this error to
    }
  );

type RegisterFormData = z.infer<typeof registerSchema>;

// Password strength calculation
const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8)             score++;
  if (/[A-Z]/.test(password))           score++;
  if (/[a-z]/.test(password))           score++;
  if (/[0-9]/.test(password))           score++;
  if (/[^a-zA-Z0-9]/.test(password))   score++;

  if (score <= 1) return { label: 'Weak',   color: 'bg-red-400',    width: 'w-1/5' };
  if (score <= 3) return { label: 'Fair',   color: 'bg-yellow-400', width: 'w-3/5' };
  return           { label: 'Strong', color: 'bg-green-500',  width: 'w-full' };
};

const RegisterPage = () => {
  const navigate     = useNavigate();
  const login        = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    // watch() returns the current live value of a field
    // We use it to calculate password strength in real-time
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue   = watch('password', '');
  const passwordStrength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError(null);

      // Destructure out confirmPassword — we don't send it to the backend
      // The backend doesn't have a confirmPassword field
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100
      flex items-center justify-center p-4 py-10">

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center
            w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Get started with BizCore
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Register your company — free trial, no credit card required
          </p>
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
            <p className="text-red-700 text-sm">⚠ {serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>

          {/* Company Name */}
          <Input
            label="Company Name"
            placeholder="Acme Corporation"
            error={errors.companyName?.message}
            {...register('companyName')}
          />

          {/* First and Last Name — side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* grid-cols-2 = two equal columns */}
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

          {/* Password with Strength Indicator */}
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
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 text-sm"
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>

            {/* Password Strength Bar */}
            {passwordValue.length > 0 && (
              <div className="mt-1">
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`
                      h-full rounded-full transition-all duration-300
                      ${passwordStrength.color}
                      ${passwordStrength.width}
                    `}
                  />
                  {/* CSS transition animates the width change smoothly */}
                </div>
                <p className={`text-xs mt-1 font-medium ${
                  passwordStrength.label === 'Strong'
                    ? 'text-green-600'
                    : passwordStrength.label === 'Fair'
                    ? 'text-yellow-600'
                    : 'text-red-500'
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
          <p className="text-xs text-gray-500 text-center">
            By registering you agree to our{' '}
            <a href="#" className="text-primary-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>
          </p>

          <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;