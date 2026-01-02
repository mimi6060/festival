'use client';

import React from 'react';
import Link from 'next/link';

export type CardVariant = 'default' | 'glow' | 'solid' | 'gradient';

interface CardProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  href?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-white/5 backdrop-blur-lg
    border border-white/10
    hover:border-primary-500/30
  `,
  glow: `
    bg-white/5 backdrop-blur-lg
    border border-white/10
    hover:border-primary-500/50
    hover:shadow-lg hover:shadow-primary-500/20
  `,
  solid: `
    bg-festival-darker
    border border-white/5
    hover:border-white/10
  `,
  gradient: `
    bg-gradient-to-br from-primary-900/30 via-festival-dark to-pink-900/30
    border border-primary-500/20
    hover:border-primary-500/40
  `,
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  variant = 'default',
  padding = 'md',
  href,
  children,
  className = '',
  onClick,
}: CardProps) {
  const baseStyles = `
    rounded-2xl
    transition-all duration-300
  `;

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${href || onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <div className={combinedClassName} onClick={onClick}>
      {children}
    </div>
  );
}

// Card Header Component
interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

// Card Title Component
interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-xl font-bold text-white ${className}`}>
      {children}
    </h3>
  );
}

// Card Description Component
interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-white/60 text-sm mt-1 ${className}`}>
      {children}
    </p>
  );
}

// Card Content Component
interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// Card Footer Component
interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-white/10 ${className}`}>
      {children}
    </div>
  );
}
