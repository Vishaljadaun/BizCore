import { useState }    from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { AxiosError }  from 'axios';
import type { DepartmentResponse } from '../../../types';
import { hrApi }       from '../../../api/hrApi';
import Input           from '../../../components/shared/Input';
import Button          from '../../../components/shared/Button';

const schema = z.object({
  firstName:    z.string().min(1, 'First name is required'),
  lastName:     z.string().min(1, 'Last name is required'),
  email:        z.string().min(1, 'Email is required')
    .email('Invalid email'),
  phone:        z.string().optional(),
  designation:  z.string().min(1, 'Designation is required'),
  departmentId: z.string().min(1, 'Department is required'),
  joiningDate:  z.string().min(1, 'Joining date is required'),
  salary:       z.number({ error: 'Enter valid salary' })
    .positive('Salary must be positive'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  departments: DepartmentResponse[];
  onClose:     () => void;
  onSuccess:   () => void;
}

const CreateEmployeeModal = ({
  departments,
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
      await hrApi.createEmployee({
        firstName:    data.firstName,
        lastName:     data.lastName,
        email:        data.email,
        phone:        data.phone || undefined,
        designation:  data.designation,
        departmentId: data.departmentId,
        joiningDate:  data.joiningDate,
        salary:       data.salary,
      });
      onSuccess();
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message ||
          'Failed to create employee.'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50
      flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl
        w-full max-w-lg animate-fade-in
        max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between
          px-6 py-4 border-b border-gray-100 sticky top-0
          bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            Add Employee
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

          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" placeholder="John"
              error={errors.firstName?.message}
              {...register('firstName')} />
            <Input label="Last Name" placeholder="Smith"
              error={errors.lastName?.message}
              {...register('lastName')} />
          </div>

          <Input label="Email" type="email"
            placeholder="john@company.com"
            error={errors.email?.message}
            {...register('email')} />

          <Input label="Phone (Optional)"
            placeholder="+91 9876543210"
            error={errors.phone?.message}
            {...register('phone')} />

          <Input label="Designation"
            placeholder="Software Engineer, HR Manager..."
            error={errors.designation?.message}
            {...register('designation')} />

          {/* Department select */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              {...register('departmentId')}
              className={`w-full px-4 py-2.5 rounded-lg
                border text-sm focus:outline-none
                focus:ring-2 focus:ring-primary-500 bg-white
                ${errors.departmentId
                  ? 'border-red-400'
                  : 'border-gray-300'
                }`}
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {errors.departmentId && (
              <span className="text-xs text-red-500">
                {errors.departmentId.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium
                text-gray-700">
                Joining Date
              </label>
              <input
                type="date"
                {...register('joiningDate')}
                className={`w-full px-4 py-2.5 rounded-lg
                  border text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary-500
                  ${errors.joiningDate
                    ? 'border-red-400'
                    : 'border-gray-300'
                  }`}
              />
              {errors.joiningDate && (
                <span className="text-xs text-red-500">
                  {errors.joiningDate.message}
                </span>
              )}
            </div>

            <Input label="Salary (₹)"
              type="number"
              placeholder="50000"
              error={errors.salary?.message}
              {...register('salary', { valueAsNumber: true })}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="secondary"
              fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" fullWidth
              isLoading={isSubmitting}>
              Add Employee
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployeeModal;