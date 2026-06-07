import { useState }    from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { AxiosError }  from 'axios';
import { companiesApi } from '../../../api/companiesApi';
import Input           from '../../../components/shared/Input';
import Button          from '../../../components/shared/Button';

const schema = z.object({
  name: z.string()
    .min(2,   'Company name must be at least 2 characters')
    .max(200, 'Too long'),
  adminFirstName: z.string()
    .min(1, 'First name is required'),
  adminLastName: z.string()
    .min(1, 'Last name is required'),
  adminEmail: z.string()
    .min(1, 'Email is required')
    .email('Invalid email'),
  adminPassword: z.string()
    .min(8,  'Min 8 characters')
    .regex(/[A-Z]/,         'Need uppercase letter')
    .regex(/[a-z]/,         'Need lowercase letter')
    .regex(/[0-9]/,         'Need a number')
    .regex(/[^a-zA-Z0-9]/, 'Need a special character'),
  subscription: z.string()
    .min(1, 'Please select subscription'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose:   () => void;
  onSuccess: () => void;
}

const CreateCompanyModal = ({ onClose, onSuccess }: Props) => {
  const [serverError, setServerError] =
    useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { subscription: 'trial' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError(null);
      await companiesApi.createCompany(data);
      onSuccess();
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message ||
          'Failed to create company.'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50
      flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl
        w-full max-w-lg animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between
          px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Create New Company
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600
              w-8 h-8 flex items-center justify-center
              rounded-lg hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-6 flex flex-col gap-4"
          noValidate
        >
          {serverError && (
            <div className="bg-red-50 border border-red-200
              rounded-lg p-3 text-red-700 text-sm">
              ⚠ {serverError}
            </div>
          )}

          {/* Company Details */}
          <div className="pb-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500
              uppercase tracking-wider mb-3">
              Company Details
            </p>
            <div className="flex flex-col gap-3">
              <Input
                label="Company Name"
                placeholder="TechNova Solutions"
                error={errors.name?.message}
                {...register('name')}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium
                  text-gray-700">
                  Subscription Plan
                </label>
                <select
                  {...register('subscription')}
                  className="w-full px-4 py-2.5 rounded-lg
                    border border-gray-300 text-sm
                    focus:outline-none focus:ring-2
                    focus:ring-primary-500 bg-white"
                >
                  <option value="trial">Trial (Free)</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>

          {/* Admin Details */}
          <div>
            <p className="text-xs font-semibold text-gray-500
              uppercase tracking-wider mb-3">
              Admin User Details
            </p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="John"
                  error={errors.adminFirstName?.message}
                  {...register('adminFirstName')}
                />
                <Input
                  label="Last Name"
                  placeholder="Smith"
                  error={errors.adminLastName?.message}
                  {...register('adminLastName')}
                />
              </div>
              <Input
                label="Admin Email"
                type="email"
                placeholder="admin@company.com"
                error={errors.adminEmail?.message}
                {...register('adminEmail')}
              />
              <Input
                label="Admin Password"
                type="password"
                placeholder="••••••••"
                error={errors.adminPassword?.message}
                helperText="Min 8 chars, uppercase, lowercase, number, special char"
                {...register('adminPassword')}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting}
            >
              Create Company
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCompanyModal;