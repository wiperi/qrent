'use client';
import React, { useState } from 'react';
import { Label } from '@/src/components/label';
import { Input } from '@/src/components/input';
import { cn } from '@/src/lib/utils';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import NotificationCard from '@/src/components/NotificationCard';

async function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
}

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notification, setNotification] = useState<{
    message: string;
    description: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      console.log(email, password);
      const baseurl = await getApiBaseUrl();
      console.log(baseurl);

      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        throw new Error('Signup failed');
      }

      console.log('Signup successful');
      setNotification({
        message: 'Login Successful',
        description: 'You have successfully login!',
        type: 'success',
      });
    } catch (err) {
      console.log(err);
      setNotification({
        message: 'Login Failed',
        description: 'Something went wrong. Please try again!',
        type: 'error',
      });
    }
  };

  const t = useTranslations('Login');

  return (
    <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white dark:bg-black font-serif font-bold">
      <h2 className="font-bold text-3xl text-blue-primary dark:text-neutral-200">{t('welcome')}</h2>
      <p className="text-black text-sm max-w-sm mt-2 dark:text-neutral-300">
        {t('login-to-continue')}
      </p>

      <form className="my-8" onSubmit={handleSubmit}>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="name">{t('user-name')}</Label>
          <Input id="name" placeholder="name" type="name" />
        </LabelInputContainer>

        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">{t('email-address')}</Label>
          <Input
            id="email"
            placeholder="projectmayhem@fc.com"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </LabelInputContainer>

        <LabelInputContainer className="mb-4">
          <Label htmlFor="password">{t('pwd')}</Label>
          <Input
            id="password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </LabelInputContainer>

        <button
          className="bg-gradient-to-br relative group/btn from-morandi-blue dark:from-zinc-700 dark:to-zinc-700 to-neutral-800 block dark:bg-zinc-700 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset]"
          type="submit"
        >
          {t('login')} &rarr;
          <BottomGradient />
        </button>

        <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-8 h-[1px] w-full" />
        <div className="flex justify-center items-center gap-2 py-1">
          <p className="text-gray-600">{t('dont-have-acc')}</p>
          <Link href="/signup" className="text-blue-primary font-semibold hover:underline">
            {t('sign-up')}
          </Link>
        </div>
      </form>

      {notification && (
        <NotificationCard
          message={notification.message}
          description={notification.description}
          type={notification.type}
        />
      )}
    </div>
  );
};

export default Login;

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn('flex flex-col space-y-2 w-full', className)}>{children}</div>;
};
