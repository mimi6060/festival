'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../ui/Button';

export interface Festival {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  price: {
    from: number;
    currency: string;
  };
  genres: string[];
  isSoldOut?: boolean;
  isFeatured?: boolean;
}

interface FestivalCardProps {
  festival: Festival;
  variant?: 'default' | 'featured' | 'compact';
}

export function FestivalCard({ festival, variant = 'default' }: FestivalCardProps) {
  const formatDate = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
    }

    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}, ${endDate.getFullYear()}`;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (variant === 'featured') {
    return (
      <Link href={`/festivals/${festival.slug}`} className="group block">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900/50 via-festival-dark to-pink-900/50 border border-primary-500/20 hover:border-primary-500/40 transition-all duration-500">
          {/* Image Section */}
          <div className="relative h-80 md:h-96 overflow-hidden">
            <Image
              src={festival.imageUrl}
              alt={festival.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-festival-dark via-festival-dark/50 to-transparent" />

            {/* Featured Badge */}
            {festival.isFeatured && (
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-secondary-400 text-festival-dark text-xs font-bold uppercase tracking-wider">
                  Featured
                </span>
              </div>
            )}

            {/* Genres */}
            <div className="absolute top-4 right-4 flex flex-wrap gap-2 justify-end">
              {festival.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-white group-hover:text-primary-300 transition-colors mb-2">
                  {festival.name}
                </h3>
                <div className="flex items-center gap-2 text-white/60">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">{festival.location}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/50 text-xs uppercase tracking-wider mb-1">From</div>
                <div className="text-2xl font-bold text-secondary-400">
                  {formatPrice(festival.price.from, festival.price.currency)}
                </div>
              </div>
            </div>

            <p className="text-white/60 text-sm mb-6 line-clamp-2">
              {festival.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/60">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">{formatDate(festival.startDate, festival.endDate)}</span>
              </div>

              {festival.isSoldOut ? (
                <span className="px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                  Sold Out
                </span>
              ) : (
                <Button variant="primary" size="sm">
                  Get Tickets
                </Button>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={`/festivals/${festival.slug}`} className="group block">
        <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary-500/30 hover:bg-white/10 transition-all duration-300">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
            <Image
              src={festival.imageUrl}
              alt={festival.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white group-hover:text-primary-300 transition-colors truncate">
              {festival.name}
            </h3>
            <p className="text-white/60 text-sm mt-1 truncate">{festival.location}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-white/50 text-xs">
                {formatDate(festival.startDate, festival.endDate)}
              </span>
              <span className="text-secondary-400 font-semibold text-sm">
                {formatPrice(festival.price.from, festival.price.currency)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={`/festivals/${festival.slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-primary-500/30 transition-all duration-300">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <Image
            src={festival.imageUrl}
            alt={festival.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-festival-dark/80 to-transparent" />

          {/* Genres */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {festival.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Sold Out Badge */}
          {festival.isSoldOut && (
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-white group-hover:text-primary-300 transition-colors mb-1 truncate">
            {festival.name}
          </h3>
          <div className="flex items-center gap-1.5 text-white/60 text-sm mb-3">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{festival.location}</span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="text-white/50 text-xs">
              {formatDate(festival.startDate, festival.endDate)}
            </div>
            <div className="text-secondary-400 font-bold">
              {formatPrice(festival.price.from, festival.price.currency)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Featured Festival Hero Component
interface FestivalHeroProps {
  festival: Festival;
}

export function FestivalHero({ festival }: FestivalHeroProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="relative min-h-[60vh] md:min-h-[70vh] flex items-end">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={festival.imageUrl}
          alt={festival.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-festival-dark via-festival-dark/70 to-festival-dark/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-festival-dark/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative container-app pb-12 md:pb-16">
        {/* Genres */}
        <div className="flex flex-wrap gap-2 mb-4">
          {festival.genres.map((genre) => (
            <span
              key={genre}
              className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium"
            >
              {genre}
            </span>
          ))}
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
          {festival.name}
        </h1>

        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 text-white/80 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{festival.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(festival.startDate)} - {formatDate(festival.endDate)}</span>
          </div>
        </div>

        <p className="text-lg text-white/70 max-w-2xl mb-8">
          {festival.description}
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {festival.isSoldOut ? (
            <div className="px-6 py-3 rounded-full bg-red-500/20 text-red-400 font-semibold">
              Sold Out
            </div>
          ) : (
            <Button as="link" href={`/festivals/${festival.slug}/tickets`} variant="accent" size="lg">
              Get Tickets from {new Intl.NumberFormat('en-US', { style: 'currency', currency: festival.price.currency, minimumFractionDigits: 0 }).format(festival.price.from)}
            </Button>
          )}
          <Button variant="secondary" size="lg">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
}
