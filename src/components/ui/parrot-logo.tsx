import React from 'react'
import Image from 'next/image'

interface ParrotLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'orange' | 'white'
}

export function ParrotLogo({ className = '', size = 'md', variant = 'orange' }: ParrotLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  const logoSrc = variant === 'white' ? '/parrot-logo.png' : '/parrot-grad.png'

  return (
    <Image
      src={logoSrc}
      alt="Parrot Logo"
      width={48}
      height={48}
      className={`${sizeClasses[size]} ${className} object-contain`}
    />
  )
}

export default ParrotLogo
