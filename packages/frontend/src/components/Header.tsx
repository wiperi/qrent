'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { HiMenu, HiX, HiUser, HiLogout } from 'react-icons/hi'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import AuthModal from './AuthModal'

export default function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  
  const { user, logout } = useAuth()

  const openDrawer = () => {
    setIsDrawerOpen(true)
    document.body.classList.add('overflow-hidden')
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
    document.body.classList.remove('overflow-hidden')
  }

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  return (
    <>
      <header className="sticky top-0 z-[60] mb-2 sm:mb-3">
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="h-16 px-2 sm:px-3 lg:px-4 flex items-center justify-between">
            {/* Left: logo + brand */}
            <Link href="/" className="flex items-center" aria-label="Qrent home">
              <Image
                src="/qrent-logo.svg"
                alt="Qrent"
                width={80}
                height={80}
                priority
                className="rounded-md"
              />
            </Link>

            {/* Center: desktop nav */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              {/* <a href="#guide" className="text-slate-700 hover:text-blue-600 transition-colors">Rental Guide</a>
              <a href="#docs" className="text-slate-700 hover:text-blue-600 transition-colors">Document Preparation</a> */}
            </nav>

            {/* Right: actions */}
            <div className="hidden md:flex items-center gap-3">
              {!user ? (
                <>
                  <button 
                    onClick={() => openAuthModal('login')}
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
                  >
                    Log in
                  </button>
                  <button 
                    onClick={() => openAuthModal('signup')}
                    className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-slate-200 hover:ring-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <span className="sr-only">User menu</span>
                    {user.name ? (
                      <Image alt="avatar" src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} width={32} height={32} className="h-8 w-8 rounded-full" />
                    ) : (
                      <HiUser className="h-5 w-5 text-slate-600" />
                    )}
                  </button>
                  
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-200 py-1 z-[9999]">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                        {user.name && <div className="font-medium">{user.name}</div>}
                        <div className="text-gray-500">{user.email}</div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <HiLogout className="mr-2 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button 
              onClick={openDrawer}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center text-slate-700 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" 
              aria-label="Open menu"
            >
              <HiMenu className="h-5 w-5" />
            </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer and overlay */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={closeDrawer}></div>
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl">
            <div className="h-16 flex items-center justify-between px-4 border-b">
              <div className="flex items-center">
                <Link href="/" onClick={closeDrawer}>
                  <Image
                    src="/qrent-logo.jpg"
                    alt="Qrent"
                    width={36}
                    height={36}
                    className="rounded-md"
                  />
                </Link>
              </div>
              <button 
                onClick={closeDrawer}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus:outline-none" 
                aria-label="Close menu"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-4 py-4 space-y-1" aria-label="Mobile">
              <a href="#guide" className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600">Rental Guide</a>
              <a href="#docs" className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600">Document Preparation</a>
              <div className="my-3 h-px bg-slate-200"></div>
              {!user ? (
                <>
                  <button 
                    onClick={() => { openAuthModal('login'); closeDrawer(); }}
                    className="block w-full text-left rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600"
                  >
                    Log in
                  </button>
                  <button 
                    onClick={() => { openAuthModal('signup'); closeDrawer(); }}
                    className="block w-full text-left rounded-md px-3 py-2 text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  <div className="px-3 py-2 text-sm text-gray-700 border-b border-gray-200">
                    {user.name && <div className="font-medium">{user.name}</div>}
                    <div className="text-gray-500">{user.email}</div>
                  </div>
                  <button
                    onClick={() => { handleLogout(); closeDrawer(); }}
                    className="flex items-center w-full rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600"
                  >
                    <HiLogout className="mr-2 h-4 w-4" />
                    Sign out
                  </button>
                </>
              )}
            </nav>
          </aside>
        </>
      )}
      
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  )
}
