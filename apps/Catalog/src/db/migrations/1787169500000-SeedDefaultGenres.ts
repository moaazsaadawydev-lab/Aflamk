import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultGenres1787169500000 implements MigrationInterface {
  name = 'SeedDefaultGenres1787169500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const genres = [
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

    for (const genre of genres) {
      await queryRunner.query(
        `INSERT INTO "genres" ("id", "name", "slug") 
         VALUES (uuid_generate_v4(), $1, $2) 
         ON CONFLICT ("slug") DO NOTHING`,
        [genre.name, genre.slug],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const slugs = [
      'action',
      'adventure',
      'animation',
      'comedy',
      'crime',
      'documentary',
      'drama',
      'family',
      'fantasy',
      'horror',
      'mystery',
      'romance',
      'sci-fi',
      'thriller',
      'war',
    ];

    await queryRunner.query(
      `DELETE FROM "genres" WHERE "slug" = ANY($1)`,
      [slugs],
    );
  }
}
