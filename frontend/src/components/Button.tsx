import clsx from 'clsx';
import Link from 'next/link';
import React, { forwardRef } from 'react'

const baseStyles={
    solid:'inline-flex justify-center rounded-lg py-3 px-5 text-lg font-semibold outline-2 outline-offset-2 transition-colors',

    outline:'inline-flex justify-center rounded-lg border py-[calc(theme(spacing.2)-1px)] px-[calc(theme(spacing.3)-1px)] text-lg outline-2 outline-offset-2 transition-colors',
};

const variantStyles={
    solid:{
        blue: 'relative overflow-hidden bg-white-10 text-blue-600 before:absolute before:inset-0 avtive:before:bg-transparent hover:before:bg-white/10 avtive:bg-blue-600 active:text-white/80 before:transition-colors',
        gray: 'bg-white-10 text-gray-800 hover:bg-white-10 active:bg-gray-800 active:text-white/80',
    },

    outline: {
        gray: 'border-gray-300 text-gray-700 hover:border-gray-400 active:bg-gray-100 active:text-gray-700/80',
    }
};

const Button = forwardRef(function Button({variant='solid', color='blue', className, href, ...props}, ref){
    className=clsx(baseStyles[variant], variantStyles[variant][color], className);

    return href? (<Link ref={ref} href={href} className={className} {...props} />) : (<button ref={ref} className={className} {...props} />)
});

export default Button