import { useState }    from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { AxiosError }  from 'axios';
import type { EmployeeResponse } from '../../../types';
import { hrApi }       from '../../../api/hrApi';
import { usersApi }    from '../../../api/usersApi';
import Input           from '../../../components/shared/Input';
import Button          from '../../../components/shared/Button';

const schema = z.object({
  password: z.string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Need uppercase letter')
    .regex(/[a-z]/, 'Need lowercase letter')
    .regex(/[0-9]/, 'Need a number')
    .regex(/[^a-zA-Z0-9]/, 'Need a special character'),
  confirmPassword: z.string()
    .min(1, 'Please confirm password'),
}).refine(
  data => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  }
);

type FormData = z.infer<typeof schema>;

interface Props {
  employee:  EmployeeResponse;
  onClose:   () => void;
  onSuccess: () => void;
}

const GiveLoginAccessModal = ({
  employee,
  onClose,
  onSuccess,
}: Props) => {
  const [serverError, setServerError] =
    useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError(null);

      // Step 1: Create a User account for this employee
      const newUser = await usersApi.createUser({
        firstName: employee.firstName,
        lastName:  employee.lastName,
        email:     employee.email,
        password:  data.password,
        role:      'Employee',
      });

      // Step 2: Link the new User to this Employee
      await hrApi.linkEmployeeToUser(
        employee.id,
        newUser.id
      );

      onSuccess();
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message ||
          'Failed to give login access.'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50
      flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl
        w-full max-w-md animate-fade-in">

        <div className="flex items-center justify-between
          px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold
              text-gray-900">
              Give Login Access
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {employee.fullName}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600
              w-8 h-8 flex items-center justify-center
              rounded-lg hover:bg-gray-100">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}
          className="p-6 flex flex-col gap-4" noValidate>

          {serverError && (
            <div className="bg-red-50 border border-red-200
              rounded-lg p-3 text-red-700 text-sm">
              ⚠ {serverError}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200
            rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium">
              Login Details
            </p>
            <div className="mt-2 flex items-center gap-2
              text-sm text-blue-600">
              <span>📧</span>
              <span>Email: {employee.email}</span>
            </div>
            <p className="text-xs text-blue-500 mt-2">
              Employee will login with their email
              and the password you set below
            </p>
          </div>

          <Input
            label="Set Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            helperText="Min 8 chars, uppercase, lowercase, number, special character"
            {...register('password')}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <div className="bg-yellow-50 border
            border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">
              ⚠ Share this password with the employee
              securely. They should change it on first login.
            </p>
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="secondary"
              fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" fullWidth
              isLoading={isSubmitting}>
              Give Access
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GiveLoginAccessModal;