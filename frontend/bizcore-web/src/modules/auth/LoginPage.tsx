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

// ── Zod Validation Schema ──────────────────────────────────────────────────
// Zod defines the rules for form data
// zodResolver connects Zod to React Hook Form
// When the form is submitted, Zod validates automatically
// If validation fails, the handler function is NOT called

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
    // On login we don't validate password complexity
    // That's only needed during registration
});

// z.infer extracts the TypeScript type from the Zod schema
// We don't have to write a separate interface — Zod generates it
type LoginFormData = z.infer<typeof loginSchema>;
// Equivalent to: { email: string; password: string }

const LoginPage = () => {
  const navigate = useNavigate();
  // useNavigate gives us a function to programmatically change the URL
  // navigate('/dashboard') = go to dashboard without page refresh

  // Subscribe to only the login action from the store
  // We don't subscribe to all state — only what we need
  // This prevents unnecessary re-renders
  const login = useAuthStore((state) => state.login);

  const [serverError,  setServerError]  = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // ── React Hook Form Setup ────────────────────────────────────────────────
  const {
    register,
    // register('fieldName') = connects an input to the form
    // Spread it onto an input: <input {...register('email')} />
    // React Hook Form now tracks this input's value, errors, dirty state

    handleSubmit,
    // Wraps our submit handler
    // 1. Runs Zod validation
    // 2. If passes: calls our handler with validated data
    // 3. If fails: populates errors object, does NOT call our handler

    formState: { errors, isSubmitting },
    // errors.email?.message = error message for email field
    // isSubmitting = true while our async handler is running
    //   → automatically set by React Hook Form
    //   → resets to false when handler completes or throws
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    // This bridges Zod schema with React Hook Form
    // Now form validation uses our Zod rules

    defaultValues: { email: '', password: '' },
  });

  // ── Submit Handler ───────────────────────────────────────────────────────
  // This only runs if Zod validation passes
  // data is fully typed and validated
  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null); // Clear any previous server error

      const response = await authApi.login(data);
      // Axios call to POST /api/auth/login
      // Throws on non-2xx responses (caught by catch below)

      login(response);
      // Save user + tokens to Zustand store (and localStorage)

      navigate('/dashboard');
      // Redirect to dashboard after successful login

    } catch (error) {
      if (error instanceof AxiosError) {
        // Server returned an error response
        const message = error.response?.data?.message
          || 'Login failed. Please try again.';
        setServerError(message);
      } else {
        setServerError('Network error. Please check your connection.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100
      flex items-center justify-center p-4">

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center
            w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Sign in to your BizCore account
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg
            p-3 mb-6 flex items-start gap-2">
            <span className="text-red-500 text-sm flex-shrink-0">⚠</span>
            <p className="text-red-700 text-sm">{serverError}</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
          noValidate
          // noValidate disables browser's built-in validation
          // We use our own Zod validation instead
        >

          <Input
            label="Email Address"
            type="email"
            placeholder="john@company.com"
            autoComplete="email"
            error={errors.email?.message}
            // errors.email?.message:
            // Optional chaining (?.) prevents crash if errors.email is undefined
            // Returns undefined if no error → Input component hides error UI
            {...register('email')}
            // Spreads: { name, ref, onChange, onBlur }
            // These are what React Hook Form needs to track the field
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
              // IMPORTANT: type="button" prevents form submission on click
              // Default button type is "submit" — clicking would submit the form
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-400
                hover:text-gray-600 text-sm"
            >
              {showPassword ? '🙈 Hide' : '👁 Show'}
            </button>
          </div>

          <div className="flex justify-end -mt-2">
            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            // isSubmitting = true while onSubmit is running
            // Button shows spinner and is disabled — prevents double submit
          >
            Sign In
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-xs">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Register Link */}
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          {/* {' '} adds a space between text and Link in JSX */}
          <Link
            to="/register"
            className="text-primary-600 font-medium hover:underline"
          >
            Register your company
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;