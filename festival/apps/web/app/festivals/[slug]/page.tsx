import { Metadata } from 'next';
import { FestivalDetailClient } from './page-client';
import { createServerApiClient } from '@/lib/api-client';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Try to fetch festival data for metadata
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    const serverApi = createServerApiClient(token);

    const response = await serverApi.get(`/festivals/by-slug/${slug}`);
    const festival = response.data;

    return {
      title: festival.name,
      description: festival.description,
      openGraph: {
        title: festival.name,
        description: festival.description,
        images: festival.imageUrl ? [festival.imageUrl] : [],
      },
    };
  } catch (error) {
    // If fetch fails, return default metadata
    return {
      title: 'Festival Details',
      description: 'View festival information and buy tickets',
    };
  }
}

/**
 * Festival Detail Page
 * Fetches and displays festival information from the API
 */
export default async function FestivalDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return <FestivalDetailClient slug={slug} />;
}
