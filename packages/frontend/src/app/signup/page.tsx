'use client';

import Link from 'next/link';
import SignupForm from '@/components/SignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
            ← Back to home
          </Link>
        </div>
        
        <SignupForm 
          onSuccess={() => window.location.href = '/'}
          onSwitchToLogin={() => window.location.href = '/login'}
        />
      </div>
    </div>
  );
}