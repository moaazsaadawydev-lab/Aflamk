import dataSource from '../data-source';
import { Genre } from '@booking-ticket-system/Entities';

export const defaultGenres = [
  { name: 'Action', slug: 'action' },
  { name: 'Adventure', slug: 'adventure' },
  { name: 'Animation', slug: 'animation' },
  { name: 'Comedy', slug: 'comedy' },
  { name: 'Crime', slug: 'crime' },
  { name: 'Documentary', slug: 'documentary' },
  { name: 'Drama', slug: 'drama' },
  { name: 'Family', slug: 'family' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Horror', slug: 'horror' },
  { name: 'Mystery', slug: 'mystery' },
  { name: 'Romance', slug: 'romance' },
  { name: 'Sci-Fi', slug: 'sci-fi' },
  { name: 'Thriller', slug: 'thriller' },
  { name: 'War', slug: 'war' },
];

export async function seedGenres(): Promise<void> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const genreRepo = dataSource.getRepository(Genre);

  console.log('🌱 Seeding default movie genres into Booking-Catalog...');

  for (const item of defaultGenres) {
    const exists = await genreRepo.findOne({
      where: [{ slug: item.slug }, { name: item.name }],
    });

    if (!exists) {
      const genre = genreRepo.create({
        name: item.name,
        slug: item.slug,
      });
      await genreRepo.save(genre);
      console.log(`  + Created genre: ${item.name} (${item.slug})`);
    } else {
      console.log(`  - Genre already exists: ${item.name} (${item.slug})`);
    }
  }

  console.log('✅ Genre seeding completed successfully.');
}

if (require.main === module) {
  seedGenres()
    .then(async () => {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('❌ Failed to seed genres:', error);
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
      process.exit(1);
    });
}
