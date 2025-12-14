'use client';

import { HiX } from 'react-icons/hi';
import LoginForm from './LoginForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-white bg-opacity-70" />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg max-w-md w-full">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-11 right-10 text-gray-400 hover:text-gray-600 z-10"
            aria-label="Close modal"
          >
            <HiX className="h-6 w-6" />
          </button>

          {/* Content */}
          <div className="p-6">
            <LoginForm onSuccess={handleSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
}