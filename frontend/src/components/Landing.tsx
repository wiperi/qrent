'use client';
import React from 'react'
import Container from './Container'
import Logo from './Logo'
import NavLinks from './NavLinks'
import Button from './Button';
import { Roboto_Flex } from 'next/font/google';

const robotoFlexFont = Roboto_Flex({
  subsets: ['latin'],
  weight: '400'
});

const Landing = () => {
  return (
    <header>
        <nav>
            <Container className='relative z-50 flex justify-between py-8'>
                {/* QRENT LOGO */}
                <div className='relative z-10'>
                    <Logo />
                </div>
                {/* Buttons */}
                <div className='flex items-center gap-6'>
                  <Button className={robotoFlexFont.className} href='#'>LOG IN</Button>
                </div>
            </Container>
        </nav>
    </header>
  )
}

export default Landing