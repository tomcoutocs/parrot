import React from 'react'

interface ParrotLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ParrotLogo({ className = '', size = 'md' }: ParrotLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  return (
    <img
      src="/orange-logo.png"
      alt="Parrot Logo"
      className={`${sizeClasses[size]} ${className} object-contain`}
    />
  )
}

export default ParrotLogo
