import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [EventsModule],
  controllers: [BookingsController],
})
export class AppModule {} 