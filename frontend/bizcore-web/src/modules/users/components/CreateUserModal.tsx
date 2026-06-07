import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { useState }    from 'react';
import { AxiosError }  from 'axios';
import { usersApi }    from '../../../api/usersApi';
import Input           from '../../../components/shared/Input';
import Button          from '../../../components/shared/Button';

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName:  z.string().min(1, 'Last name is required').max(100),
  email:     z.string().min(1, 'Email is required').email('Invalid email'),
  password:  z.string()
    .min(8,  'Min 8 characters')
    .regex(/[A-Z]/,         'Need uppercase letter')
    .regex(/[a-z]/,         'Need lowercase letter')
    .regex(/[0-9]/,         'Need a number')
    .regex(/[^a-zA-Z0-9]/, 'Need a special character'),
  role: z.string().min(1, 'Please select a role'),
});

type FormData = z.infer<typeof createUserSchema>;

interface Props {
  onClose:   () => void;
  onSuccess: () => void;
}

const CreateUserModal = ({ onClose, onSuccess }: Props) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'Employee' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError(null);
      await usersApi.createUser(data);
      onSuccess();
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message || 'Failed to create user.'
        );
      }
    }
  };

  return (
    // Modal overlay
    <div className="fixed inset-0 bg-black/50 z-50
      flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl
        w-full max-w-md animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between
          px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Add New User
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600
              w-8 h-8 flex items-center justify-center
              rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
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

          <Input
            label="Email Address"
            type="email"
            placeholder="john@company.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            helperText="Min 8 chars, uppercase, lowercase, number, special char"
            {...register('password')}
          />

          {/* Role select */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              {...register('role')}
              className={`
                w-full px-4 py-2.5 rounded-lg border text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500
                bg-white
                ${errors.role
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-300'
                }
              `}
            >
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
              <option value="CompanyAdmin">Company Admin</option>
              <option value="Vendor">Vendor</option>
            </select>
            {errors.role && (
              <span className="text-xs text-red-500">
                {errors.role.message}
              </span>
            )}
          </div>

          {/* Actions */}
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
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;