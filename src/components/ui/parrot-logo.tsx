import React from 'react'

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

  const logoSrc = variant === 'white' ? '/parrot-logo.png' : '/orange-logo.png'

  return (
    <img
      src={logoSrc}
      alt="Parrot Logo"
      className={`${sizeClasses[size]} ${className} object-contain`}
    />
  )
}

export default ParrotLogo
