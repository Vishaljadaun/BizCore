import { useState }    from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import api from '../../../api/axiosClient';
import { Dialog } from '../../operations/ui';
import { errorText } from '../../operations/errors';
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
  employee?: import('../../../types').EmployeeResponse;
  departments: DepartmentResponse[];
  onClose:     () => void;
  onSuccess:   () => void;
}

const CreateEmployeeModal = ({
  employee,
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
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: employee ? { ...employee, phone: employee.phone || '', joiningDate: employee.joiningDate.slice(0, 10) } : undefined });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError(null);
      const payload = {
        firstName:    data.firstName,
        lastName:     data.lastName,
        email:        data.email,
        phone:        data.phone || undefined,
        designation:  data.designation,
        departmentId: data.departmentId,
        joiningDate:  data.joiningDate,
        salary:       data.salary,
      };
      if (employee) await api.put(`/hr/employees/${employee.id}`, payload);
      else await hrApi.createEmployee(payload);
      onSuccess();
    } catch (error) {
      setServerError(errorText(error));
    }
  };

  return (
    <Dialog title={employee ? 'Edit Employee' : 'Add Employee'} close={onClose} busy={isSubmitting}>
        <form onSubmit={handleSubmit(onSubmit)}
          className="p-6 flex flex-col gap-4" noValidate>

          {serverError && (
            <div className="bg-red-50 border border-red-200
              rounded-lg p-3 text-red-700 text-sm">
              ⚠ {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label htmlFor="employee-department" className="text-sm font-medium text-gray-700">
              Department
            </label>
            <select id="employee-department"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="employee-joining-date" className="text-sm font-medium
                text-gray-700">
                Joining Date
              </label>
              <input
                id="employee-joining-date"
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
              type="number" step="0.01"
              placeholder="50000"
              error={errors.salary?.message}
              {...register('salary', { valueAsNumber: true })}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="secondary"
              fullWidth disabled={isSubmitting} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" fullWidth
              isLoading={isSubmitting}>
              {employee ? 'Save Employee' : 'Add Employee'}
            </Button>
          </div>
        </form>
    </Dialog>
  );
};

export default CreateEmployeeModal;