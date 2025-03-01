import React, { useState } from 'react'
import { navData } from '../constants'
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { Roboto_Flex } from "next/font/google";
import clsx from 'clsx';

const robotoFlexFont = Roboto_Flex({
  subsets: ['latin'],
  weight: '400'
})

const NavLinks = () => {
    const [hoverIndex, setHoverIndex] = useState(null);
  return <>
{
    navData.map(({_id, title, href}) => (
        <Link 
            key={_id} 
            href={href} 
            className={clsx("relative -mx-3 -my-2 rounded-lg py-2 px-3 text-base text-blue-500 transition-colors", robotoFlexFont.className)}
            onMouseEnter={()=>setHoverIndex(_id)}
            onMouseLeave={()=>setHoverIndex(null)}
        >
            <AnimatePresence>
                {
                    hoverIndex === _id && (
                        <motion.span 
                            className="absolute inset-0 rounded-lg bg-blue-100"
                            layoutId="hoverBackground" 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: { duration: 0.15 } }}
                            exit={{
                                opacity: 0,
                                transition: { duration: 0.15, delay: 0.2 },
                            }}
                        />
                    )
                }
            </AnimatePresence>
            <span key='{title}' className='relative z-10'>{title}</span>
        </Link>
    ))
}
  </>
};

export default NavLinks