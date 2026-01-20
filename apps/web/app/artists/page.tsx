'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const featuredArtists = [
  {
    name: 'DJ Snake',
    genre: 'Electro / EDM',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  },
  {
    name: 'Christine and the Queens',
    genre: 'Pop / Art Pop',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
  },
  {
    name: 'Angele',
    genre: 'Pop / Chanson',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=400&fit=crop',
  },
  {
    name: 'Orelsan',
    genre: 'Rap / Hip-Hop',
    image: 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=400&h=400&fit=crop',
  },
  {
    name: 'Kungs',
    genre: 'House / Deep House',
    image: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&h=400&fit=crop',
  },
  {
    name: 'Clara Luciani',
    genre: 'Pop / Chanson',
    image: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=400&h=400&fit=crop',
  },
  {
    name: 'Justice',
    genre: 'Electro / French Touch',
    image: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=400&h=400&fit=crop',
  },
  {
    name: 'Stromae',
    genre: 'Pop / Electro',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop',
  },
];

const genres = ['Tous', 'Electro', 'Pop', 'Rap', 'Rock', 'Jazz', 'Classique'];

export default function ArtistsPage() {
  const [selectedGenre, setSelectedGenre] = useState('Tous');

  const filteredArtists =
    selectedGenre === 'Tous'
      ? featuredArtists
      : featuredArtists.filter((artist) =>
          artist.genre.toLowerCase().includes(selectedGenre.toLowerCase())
        );

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-app">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Decouvrez nos <span className="text-primary-400">Artistes</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Des talents locaux aux superstars internationales, explorez les artistes qui font vibrer
            nos festivals.
          </p>
        </div>

        {/* Genre Filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                genre === selectedGenre
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Artists Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          {filteredArtists.map((artist) => (
            <Card
              key={artist.name}
              variant="solid"
              padding="none"
              className="overflow-hidden group"
            >
              <div className="aspect-square relative">
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-white text-lg">{artist.name}</h3>
                  <p className="text-white/60 text-sm">{artist.genre}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredArtists.length === 0 && (
          <div className="text-center py-12 mb-12">
            <p className="text-white/60 text-lg">
              Aucun artiste trouve pour le genre &quot;{selectedGenre}&quot;
            </p>
            <button
              onClick={() => setSelectedGenre('Tous')}
              className="mt-4 text-primary-400 hover:text-primary-300 transition-colors"
            >
              Voir tous les artistes
            </button>
          </div>
        )}

        {/* CTA */}
        <Card variant="gradient" padding="lg" className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Vous etes un artiste ?</h2>
          <p className="text-white/60 mb-6 max-w-xl mx-auto">
            Rejoignez notre plateforme et connectez-vous avec les plus grands festivals.
          </p>
          <Button as="link" href="/contact" variant="primary" size="lg">
            Nous contacter
          </Button>
        </Card>
      </div>
    </div>
  );
}
