import React from 'react'

interface SectionProps {
  /** 标题 */
  title?: string
  /** 副标题 */
  subtitle?: string
  /** 子内容 */
  children: React.ReactNode
  /** 自定义类名 */
  className?: string
  /** 背景色 */
  background?: 'white' | 'gray' | 'transparent'
}

export default function Section({
  title,
  subtitle,
  children,
  className = '',
  background = 'transparent'
}: SectionProps) {
  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    transparent: ''
  }

  return (
    <section className={`${backgroundClasses[background]} pb-6 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-4 text-xl text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
