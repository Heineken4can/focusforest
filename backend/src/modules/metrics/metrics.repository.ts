import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, MetricEventName } from '@prisma/client';

@Injectable()
export class MetricsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createMany(events: Prisma.ProductMetricEventCreateManyInput[]) {
    return this.prismaService.productMetricEvent.createMany({
      data: events,
      skipDuplicates: true,
    });
  }

  async findByEventId(eventId: string) {
    return this.prismaService.productMetricEvent.findUnique({
      where: { eventId },
    });
  }
}
