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
    bg-white/5
    border border-white/10
    hover:bg-white/10
  `,
  glow: `
    bg-white/5
    border border-white/10
    hover:bg-white/10
    hover:shadow-lg hover:shadow-primary-500/20
  `,
  solid: `
    bg-white/10
    border border-white/10
    hover:bg-white/15
  `,
  gradient: `
    bg-gradient-to-br from-white/10 via-white/5 to-white/10
    border border-white/10
    hover:bg-white/10
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
    rounded-xl
    transition
  `;

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${href || onClick ? 'cursor-pointer' : ''}
    ${className}
  `
    .trim()
    .replace(/\s+/g, ' ');

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        <>{children}</>
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
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

// Card Title Component
interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return <h3 className={`text-xl font-bold text-theme-primary ${className}`}>{children}</h3>;
}

// Card Description Component
interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return <p className={`text-theme-muted text-sm mt-1 ${className}`}>{children}</p>;
}

// Card Content Component
interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

// Card Footer Component
interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={`mt-4 pt-4 border-t border-white/10 ${className}`}>{children}</div>;
}
