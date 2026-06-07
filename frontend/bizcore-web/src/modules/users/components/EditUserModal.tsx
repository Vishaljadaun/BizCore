import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { useState }    from 'react';
import { AxiosError }  from 'axios';
import type { UserResponse } from '../../../types';
import { usersApi }    from '../../../api/usersApi';
import Input           from '../../../components/shared/Input';
import Button          from '../../../components/shared/Button';

const editUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName:  z.string().min(1, 'Last name is required').max(100),
  email:     z.string().min(1, 'Email is required').email('Invalid email'),
  role:      z.string().min(1, 'Role is required'),
});

type FormData = z.infer<typeof editUserSchema>;

interface Props {
  user:      UserResponse;
  onClose:   () => void;
  onSuccess: () => void;
}

const EditUserModal = ({ user, onClose, onSuccess }: Props) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      role:      user.role,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError(null);

      // Update basic info
      await usersApi.updateUser(user.id, {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
      });

      // Change role if it changed
      if (data.role !== user.role) {
        await usersApi.changeRole(user.id, data.role);
      }

      onSuccess();
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message || 'Failed to update user.'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50
      flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl
        w-full max-w-md animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between
          px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Edit User
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {user.fullName}
            </p>
          </div>
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last Name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Role */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              {...register('role')}
              className="w-full px-4 py-2.5 rounded-lg border
                border-gray-300 text-sm focus:outline-none
                focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
              <option value="CompanyAdmin">Company Admin</option>
              <option value="Vendor">Vendor</option>
            </select>
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
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;