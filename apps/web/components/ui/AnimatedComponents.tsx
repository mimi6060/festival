'use client';

import React, { useEffect, useRef, useState } from 'react';

// ============================================
// Types
// ============================================

export type AnimationType =
  | 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight'
  | 'scaleIn' | 'popIn' | 'bounceIn'
  | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight';

export type AnimationDuration = 'fast' | 'normal' | 'slow' | 'slower';

export type AnimationEasing = 'smooth' | 'bounce' | 'spring' | 'snappy';

// ============================================
// Animated Wrapper Component
// ============================================

interface AnimatedProps {
  children: React.ReactNode;
  animation?: AnimationType;
  duration?: AnimationDuration;
  delay?: number;
  easing?: AnimationEasing;
  className?: string;
  triggerOnView?: boolean;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
}

const durationMap: Record<AnimationDuration, string> = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '700ms',
};

const easingMap: Record<AnimationEasing, string> = {
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  snappy: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
};

export function Animated({
  children,
  animation = 'fadeIn',
  duration = 'normal',
  delay = 0,
  easing = 'smooth',
  className = '',
  triggerOnView = false,
  threshold = 0.1,
  as: Component = 'div',
}: AnimatedProps) {
  const [isVisible, setIsVisible] = useState(!triggerOnView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerOnView) {return;}

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [triggerOnView, threshold]);

  const style: React.CSSProperties = {
    animationDuration: durationMap[duration],
    animationDelay: `${delay}ms`,
    animationTimingFunction: easingMap[easing],
    animationFillMode: 'both',
    opacity: isVisible ? undefined : 0,
  };

  const animationClass = isVisible ? `animate-${animation}` : '';

  return React.createElement(
    Component,
    {
      ref,
      className: `${animationClass} ${className}`.trim(),
      style,
    },
    children
  );
}

// ============================================
// Stagger Children Animation
// ============================================

interface StaggerProps {
  children: React.ReactNode;
  animation?: AnimationType;
  duration?: AnimationDuration;
  staggerDelay?: number;
  easing?: AnimationEasing;
  className?: string;
  triggerOnView?: boolean;
  threshold?: number;
}

export function Stagger({
  children,
  animation = 'fadeInUp',
  duration = 'normal',
  staggerDelay = 100,
  easing = 'smooth',
  className = '',
  triggerOnView = false,
  threshold = 0.1,
}: StaggerProps) {
  const [isVisible, setIsVisible] = useState(!triggerOnView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerOnView) {return;}

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [triggerOnView, threshold]);

  return (
    <div ref={ref} className={className}>
      {React.Children.map(children, (child, index) => (
        <Animated
          animation={animation}
          duration={duration}
          delay={isVisible ? index * staggerDelay : 0}
          easing={easing}
          triggerOnView={false}
        >
          {isVisible ? child : <div style={{ opacity: 0 }}>{child}</div>}
        </Animated>
      ))}
    </div>
  );
}

// ============================================
// Hover Lift Component
// ============================================

interface HoverLiftProps {
  children: React.ReactNode;
  lift?: number;
  shadow?: boolean;
  scale?: number;
  className?: string;
  onClick?: () => void;
}

export function HoverLift({
  children,
  lift = 4,
  shadow = true,
  scale = 1,
  className = '',
  onClick,
}: HoverLiftProps) {
  return (
    <div
      className={`
        transition-all duration-300 ease-out cursor-pointer
        hover:shadow-lg
        ${className}
      `}
      style={{
        ['--lift' as string]: `${lift}px`,
        ['--scale' as string]: scale,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = `translateY(-${lift}px) scale(${scale})`;
        if (shadow) {
          el.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0) scale(1)';
        el.style.boxShadow = '';
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}

// ============================================
// Ripple Effect Component
// ============================================

interface RippleProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  disabled?: boolean;
}

export function Ripple({
  children,
  color = 'rgba(255, 255, 255, 0.3)',
  className = '',
  disabled = false,
}: RippleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const createRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) {return;}

    const container = containerRef.current;
    if (!container) {return;}

    const rect = container.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: ${color};
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out forwards;
      pointer-events: none;
    `;

    container.appendChild(ripple);

    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onClick={createRipple}
    >
      {children}
    </div>
  );
}

// ============================================
// Pulse Component
// ============================================

interface PulseProps {
  children: React.ReactNode;
  active?: boolean;
  color?: string;
  className?: string;
}

export function Pulse({
  children,
  active = true,
  color = 'rgba(139, 92, 246, 0.5)',
  className = '',
}: PulseProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      {children}
      {active && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: color,
            opacity: 0.75,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ============================================
// Skeleton Loading Component
// ============================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  animate?: boolean;
}

const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = 'md',
  className = '',
  animate = true,
}: SkeletonProps) {
  return (
    <div
      className={`
        bg-white/10
        ${roundedMap[rounded]}
        ${animate ? 'animate-shimmer' : ''}
        ${className}
      `}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        background: animate
          ? 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)'
          : undefined,
        backgroundSize: '200% 100%',
      }}
      role="status"
      aria-label="Loading..."
    />
  );
}

// ============================================
// Text Skeleton
// ============================================

interface TextSkeletonProps {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
}

export function TextSkeleton({
  lines = 3,
  lastLineWidth = '70%',
  className = '',
}: TextSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading text...">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height="0.875rem"
        />
      ))}
    </div>
  );
}

// ============================================
// Card Skeleton
// ============================================

interface CardSkeletonProps {
  imageHeight?: string | number;
  showImage?: boolean;
  className?: string;
}

export function CardSkeleton({
  imageHeight = '12rem',
  showImage = true,
  className = '',
}: CardSkeletonProps) {
  return (
    <div
      className={`
        rounded-2xl bg-white/5 border border-white/10 overflow-hidden
        ${className}
      `}
      role="status"
      aria-label="Loading card..."
    >
      {showImage && (
        <Skeleton width="100%" height={imageHeight} rounded="none" />
      )}
      <div className="p-4 space-y-3">
        <Skeleton width="60%" height="1.25rem" />
        <Skeleton width="40%" height="0.875rem" />
        <div className="pt-3 border-t border-white/10 flex justify-between items-center">
          <Skeleton width="30%" height="0.75rem" />
          <Skeleton width="20%" height="1rem" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Progress Bar with Animation
// ============================================

interface AnimatedProgressProps {
  value: number;
  max?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

const progressColorMap = {
  primary: 'bg-gradient-to-r from-primary-500 to-pink-500',
  secondary: 'bg-secondary-400',
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
};

const progressSizeMap = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function AnimatedProgress({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  animate = true,
  className = '',
}: AnimatedProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-sm text-white/60 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={`
          w-full bg-white/10 rounded-full overflow-hidden
          ${progressSizeMap[size]}
        `}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`
            ${progressSizeMap[size]}
            ${progressColorMap[color]}
            rounded-full
            ${animate ? 'transition-all duration-500 ease-out' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// Floating Label Input Animation
// ============================================

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FloatingLabelInput({
  label,
  error,
  className = '',
  ...props
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

  const isFloating = isFocused || hasValue;

  return (
    <div className={`relative ${className}`}>
      <input
        {...props}
        className={`
          peer w-full px-4 pt-6 pb-2
          bg-white/5 border rounded-xl
          text-white placeholder-transparent
          transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-primary-500/50
          ${error ? 'border-red-500' : 'border-white/10 focus:border-primary-500/50'}
        `}
        placeholder={label}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          setHasValue(!!e.target.value);
          props.onBlur?.(e);
        }}
        onChange={(e) => {
          setHasValue(!!e.target.value);
          props.onChange?.(e);
        }}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
      />
      <label
        className={`
          absolute left-4 transition-all duration-300 pointer-events-none
          ${isFloating
            ? 'top-2 text-xs text-primary-400'
            : 'top-1/2 -translate-y-1/2 text-white/50'
          }
        `}
        htmlFor={props.id}
      >
        {label}
      </label>
      {error && (
        <p
          id={`${props.id}-error`}
          className="mt-1 text-sm text-red-400 animate-fadeIn"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================
// Collapse Animation Component
// ============================================

interface CollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapse({ isOpen, children, className = '' }: CollapseProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(isOpen ? undefined : 0);

  useEffect(() => {
    if (!contentRef.current) {return;}

    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);
      const timeout = setTimeout(() => setHeight(undefined), 300);
      return () => clearTimeout(timeout);
    } else {
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => setHeight(0));
    }
  }, [isOpen]);

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-out ${className}`}
      style={{ height: height === undefined ? 'auto' : height }}
      aria-hidden={!isOpen}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

// ============================================
// Count Up Animation
// ============================================

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function CountUp({
  end,
  start = 0,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: CountUpProps) {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) {return;}

    const startTime = Date.now();
    const difference = end - start;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      countRef.current = start + difference * easeOut;
      setCount(countRef.current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, start, end, duration]);

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}
