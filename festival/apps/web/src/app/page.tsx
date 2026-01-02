import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FestivalCard, Festival } from '../components/festivals/FestivalCard';

// Mock data - in a real app this would come from an API
const featuredFestivals: Festival[] = [
  {
    id: '1',
    slug: 'electric-dreams-2025',
    name: 'Electric Dreams Festival',
    description: 'Experience the ultimate electronic music festival featuring world-renowned DJs and immersive art installations across 5 stages.',
    location: 'Barcelona, Spain',
    startDate: '2025-07-15',
    endDate: '2025-07-18',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop',
    price: { from: 199, currency: 'EUR' },
    genres: ['Electronic', 'House', 'Techno'],
    isFeatured: true,
  },
  {
    id: '2',
    slug: 'rock-revolution-2025',
    name: 'Rock Revolution',
    description: 'The biggest rock festival in Europe with legendary headliners and emerging artists.',
    location: 'London, UK',
    startDate: '2025-08-22',
    endDate: '2025-08-24',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop',
    price: { from: 149, currency: 'GBP' },
    genres: ['Rock', 'Alternative', 'Metal'],
  },
  {
    id: '3',
    slug: 'summer-beats-2025',
    name: 'Summer Beats Festival',
    description: 'A celebration of hip-hop, R&B, and urban music under the summer sun.',
    location: 'Paris, France',
    startDate: '2025-06-28',
    endDate: '2025-06-30',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
    price: { from: 129, currency: 'EUR' },
    genres: ['Hip-Hop', 'R&B', 'Urban'],
  },
  {
    id: '4',
    slug: 'jazz-nights-2025',
    name: 'Jazz Nights',
    description: 'An intimate jazz experience in the heart of Amsterdam with international artists.',
    location: 'Amsterdam, Netherlands',
    startDate: '2025-09-05',
    endDate: '2025-09-07',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
    price: { from: 89, currency: 'EUR' },
    genres: ['Jazz', 'Soul', 'Blues'],
  },
];

const stats = [
  { value: '500+', label: 'Festivals' },
  { value: '2M+', label: 'Tickets Sold' },
  { value: '50+', label: 'Countries' },
  { value: '10K+', label: 'Artists' },
];

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Instant Booking',
    description: 'Book your tickets in seconds with our streamlined checkout process.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Secure Payments',
    description: 'Your transactions are protected with bank-level security.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: 'Mobile Tickets',
    description: 'Access your tickets anytime from your phone. No printing required.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: '24/7 Support',
    description: 'Our team is here to help you before, during, and after the festival.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-hero-pattern" />
          <div className="absolute inset-0 bg-gradient-radial from-primary-500/20 via-transparent to-transparent" />

          {/* Animated Elements */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/30 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        </div>

        <div className="container-app relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6">
              <span className="gradient-text">Experience</span>
              <br />
              <span className="text-white">the Music</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/70 mb-8 max-w-2xl mx-auto">
              Discover and book tickets to the world&apos;s most incredible music festivals. Your next unforgettable adventure starts here.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button as="link" href="/festivals" variant="accent" size="lg">
                Explore Festivals
              </Button>
              <Button as="link" href="/about" variant="secondary" size="lg">
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">
                    {stat.value}
                  </div>
                  <div className="text-white/50 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Featured Festival */}
      <section className="py-20 bg-festival-darker">
        <div className="container-app">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="section-title mb-2">Featured Festival</h2>
              <p className="text-white/60">Don&apos;t miss the event of the year</p>
            </div>
          </div>

          <FestivalCard festival={featuredFestivals[0]} variant="featured" />
        </div>
      </section>

      {/* Upcoming Festivals */}
      <section className="py-20">
        <div className="container-app">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="section-title mb-2">Upcoming Festivals</h2>
              <p className="text-white/60">Find your perfect festival experience</p>
            </div>
            <Button as="link" href="/festivals" variant="secondary">
              View All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredFestivals.slice(1).map((festival) => (
              <FestivalCard key={festival.id} festival={festival} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-festival-darker">
        <div className="container-app">
          <div className="text-center mb-16">
            <h2 className="section-title mb-4">Why Choose FestivalHub?</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              We make discovering and attending festivals simple, secure, and unforgettable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} variant="glow" padding="lg">
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/50 via-festival-dark to-pink-900/50" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/20 rounded-full blur-3xl" />
        </div>

        <div className="container-app relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Ready to Make Memories?
            </h2>
            <p className="text-xl text-white/70 mb-8">
              Join millions of festival-goers and discover your next adventure. Sign up today and get exclusive access to early bird tickets.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button as="link" href="/auth/register" variant="accent" size="lg">
                Get Started Free
              </Button>
              <Button as="link" href="/festivals" variant="secondary" size="lg">
                Browse Festivals
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-festival-darker">
        <div className="container-app">
          <Card variant="gradient" padding="lg" className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-white mb-2">Stay in the Loop</h3>
                <p className="text-white/60">
                  Get the latest festival news, exclusive offers, and early access to tickets.
                </p>
              </div>
              <form className="flex gap-3 w-full md:w-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 md:w-64 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary-500 transition-colors"
                />
                <Button type="submit" variant="primary">
                  Subscribe
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
