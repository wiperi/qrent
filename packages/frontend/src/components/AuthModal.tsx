'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { HiX } from 'react-icons/hi';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const panel = useRef<HTMLDivElement>(null);
  const t = useTranslations('Auth');

  // Update mode when initialMode changes
  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(
        panel.current?.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex="0"]') || []
      ).filter(item => !item.hasAttribute('disabled') && item.getClientRects().length > 0);
      const first = items[0],
        last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        panel.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) panel.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40" aria-hidden="true" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={t(mode === 'login' ? 'loginTitle' : 'signupTitle')}
          tabIndex={-1}
          className="relative bg-white rounded-xl max-w-md w-full shadow-xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-11 right-10 text-gray-400 hover:text-gray-600 z-10"
            aria-label={t('close')}
          >
            <HiX className="h-6 w-6" />
          </button>

          {/* Content */}
          <div className="p-6">
            {mode === 'login' ? (
              <LoginForm onSuccess={handleSuccess} onSwitchToSignup={() => setMode('signup')} />
            ) : (
              <SignupForm onSuccess={handleSuccess} onSwitchToLogin={() => setMode('login')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
