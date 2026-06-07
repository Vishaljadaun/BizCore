import { useState }   from 'react';
import { AxiosError } from 'axios';
import type { UserResponse } from '../../../types';
import { usersApi }   from '../../../api/usersApi';
import Button         from '../../../components/shared/Button';

interface Props {
  user:      UserResponse;
  onClose:   () => void;
  onSuccess: () => void;
}

const DeleteConfirmModal = ({ user, onClose, onSuccess }: Props) => {
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [serverError,  setServerError]  = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setServerError(null);
      await usersApi.deleteUser(user.id);
      onSuccess();
    } catch (error) {
      if (error instanceof AxiosError) {
        setServerError(
          error.response?.data?.message || 'Failed to delete user.'
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50
      flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl
        w-full max-w-sm animate-fade-in p-6">

        {/* Icon */}
        <div className="w-12 h-12 bg-red-100 rounded-full
          flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-xl">🗑️</span>
        </div>

        <h2 className="text-lg font-semibold text-gray-900
          text-center">
          Delete User
        </h2>
        <p className="text-gray-500 text-sm text-center mt-2">
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-900">
            {user.fullName}
          </span>
          ? This action cannot be undone.
        </p>

        {serverError && (
          <div className="bg-red-50 border border-red-200
            rounded-lg p-3 mt-4 text-red-700 text-sm">
            ⚠ {serverError}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            isLoading={isDeleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;