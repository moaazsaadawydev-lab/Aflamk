import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from '@booking-ticket-system/Entities';

@Controller()
export class CatalogEventsController {
  private readonly logger = new Logger(CatalogEventsController.name);

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) {}

  @EventPattern('review.created')
  async handleReviewCreated(
    @Payload() data: { movieId: string; rating: number },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      this.logger.log(`Received review.created event: ${JSON.stringify(data)}`);

      if (data?.movieId && data?.rating !== undefined) {
        const movie = await this.movieRepository.findOne({
          where: { id: data.movieId },
        });

        if (movie) {
          const currentCount = movie.ratingCount || 0;
          const currentAverage = Number(movie.ratingAverage) || 0;
          const newCount = currentCount + 1;
          const newAverage = Number(
            ((currentAverage * currentCount + data.rating) / newCount).toFixed(2),
          );

          movie.ratingCount = newCount;
          movie.ratingAverage = newAverage;
          await this.movieRepository.save(movie);

          this.logger.log(
            `Updated movie "${movie.id}" rating to ${newAverage} (${newCount} reviews)`,
          );
        }
      }

      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(
        `Error processing review.created event: ${(error as Error).message}`,
      );
      channel.nack(originalMsg, false, false);
    }
  }
}
