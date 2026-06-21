import { useState }    from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { AxiosError }  from 'axios';
import { hrApi }       from '../../../api/hrApi';
import Input           from '../../../components/shared/Input';
import Button          from '../../../components/shared/Button';

const schema = z.object({
  name: z.string()
    .min(1, 'Department name is required')
    .max(100, 'Max 100 characters'),
  description: z.string()
    .max(500, 'Max 500 characters')
    .optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose:   () => void;
  onSuccess: () => void;
}

const CreateDepartmentModal = ({ onClose, onSuccess }: Props) => {
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
      await hrApi.createDepartment({
        name:        data.name,
        description: data.description || null,
      });
      onSuccess();
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message ||
          'Failed to create department.'
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
          <h2 className="text-lg font-semibold text-gray-900">
            Create Department
          </h2>
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

          <Input
            label="Department Name"
            placeholder="Engineering, Sales, HR..."
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              placeholder="Brief description of this department..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border
                border-gray-300 text-sm focus:outline-none
                focus:ring-2 focus:ring-primary-500 resize-none"
            />
            {errors.description && (
              <span className="text-xs text-red-500">
                {errors.description.message}
              </span>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="secondary"
              fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" fullWidth
              isLoading={isSubmitting}>
              Create Department
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDepartmentModal;