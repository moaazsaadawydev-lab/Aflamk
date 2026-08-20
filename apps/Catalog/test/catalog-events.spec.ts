import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RmqContext } from '@nestjs/microservices';
import { Movie } from '@booking-ticket-system/Entities';
import { CatalogEventsController } from '../src/app/events/catalog-events.controller';

describe('CatalogEventsController', () => {
  let controller: CatalogEventsController;
  let movieRepository: jest.Mocked<Repository<Movie>>;

  const mockChannel: any = {
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockOriginalMsg = {
    content: Buffer.from('{}'),
    fields: { deliveryTag: 1 },
  };

  const mockContext: any = {
    getChannelRef: jest.fn().mockReturnValue(mockChannel),
    getMessage: jest.fn().mockReturnValue(mockOriginalMsg),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogEventsController],
      providers: [
        {
          provide: getRepositoryToken(Movie),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn().mockImplementation((m) => Promise.resolve(m)),
          },
        },
      ],
    }).compile();

    controller = module.get<CatalogEventsController>(CatalogEventsController);
    movieRepository = module.get(getRepositoryToken(Movie));
  });

  it('should acknowledge review.created message upon updating rating', async () => {
    const movie: any = {
      id: 'movie-1',
      ratingAverage: 4.0,
      ratingCount: 1,
    };
    movieRepository.findOne.mockResolvedValue(movie);

    await controller.handleReviewCreated(
      {
        movieId: 'movie-1',
        rating: 5,
      },
      mockContext as RmqContext,
    );

    expect(movieRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ratingAverage: 4.5,
        ratingCount: 2,
      }),
    );
    expect(mockChannel.ack).toHaveBeenCalledWith(mockOriginalMsg);
  });

  it('should nack message when processing fails', async () => {
    movieRepository.findOne.mockRejectedValue(new Error('DB Connection Error'));

    await controller.handleReviewCreated(
      {
        movieId: 'movie-1',
        rating: 5,
      },
      mockContext as RmqContext,
    );

    expect(mockChannel.nack).toHaveBeenCalledWith(mockOriginalMsg, false, false);
  });
});
