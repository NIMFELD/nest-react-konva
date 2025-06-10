// NestJS controller for events
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';

// Interface para eventos mock del sistema personalizado
interface MockEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  description: string;
  totalSeats: number;
  availableSeats: number;
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ============ ENDPOINTS PARA SISTEMA PERSONALIZADO ============
  
  @Get()
  async getAllEvents(): Promise<MockEvent[]> {
    // Retornar eventos mock para el sistema personalizado
    const mockEvents: MockEvent[] = [
      {
        id: 'event-1',
        name: 'Concierto Rock Nacional',
        date: '2025-02-15T20:00:00.000Z',
        venue: 'Teatro Principal',
        description: 'Una noche épica con las mejores bandas de rock nacional',
        totalSeats: 1200,
        availableSeats: 950
      },
      {
        id: 'event-2', 
        name: 'Obra de Teatro: Hamlet',
        date: '2025-02-20T19:30:00.000Z',
        venue: 'Teatro Principal',
        description: 'La clásica obra de Shakespeare interpretada por reconocidos actores',
        totalSeats: 800,
        availableSeats: 650
      },
      {
        id: 'event-3',
        name: 'Festival de Jazz',
        date: '2025-03-01T18:00:00.000Z',
        venue: 'Teatro Principal',
        description: 'Una velada mágica con los mejores músicos de jazz de la región',
        totalSeats: 1000,
        availableSeats: 780
      },
      {
        id: 'event-4',
        name: 'Comedia Stand-up',
        date: '2025-03-10T21:00:00.000Z',
        venue: 'Teatro Principal',
        description: 'Risas garantizadas con los mejores comediantes del país',
        totalSeats: 600,
        availableSeats: 420
      }
    ];

    return mockEvents;
  }

  @Get('seat-io-events')
  async getSeatIoEvents() {
    // Mantener el endpoint original para Seat.io
    return this.eventsService.getAllEvents();
  }

  @Get('config')
  async getConfig() {
    return this.eventsService.getConfig();
  }

  @Post()
  async createEvent(@Body() body: { chartKey?: string; eventKey?: string }) {
    return this.eventsService.createEvent(body.chartKey, body.eventKey);
  }

  @Get(':eventKey')
  async getEvent(@Param('eventKey') eventKey: string) {
    return this.eventsService.getEvent(eventKey);
  }

  @Get(':eventKey/objects')
  async getEventObjects(@Param('eventKey') eventKey: string) {
    return this.eventsService.getEventObjects(eventKey);
  }

  // ============ NUEVOS ENDPOINTS PARA CHARTS ============

  @Post('charts')
  async createChart(@Body() body: { name?: string; venueType?: string }) {
    return this.eventsService.createChart(body.name, body.venueType);
  }

  @Get('charts/:chartKey')
  async getChart(@Param('chartKey') chartKey: string) {
    return this.eventsService.getChart(chartKey);
  }

  @Get('charts/:chartKey/categories')
  async getChartCategories(@Param('chartKey') chartKey: string) {
    return this.eventsService.getChartCategories(chartKey);
  }

  @Post('charts/:chartKey/categories')
  async updateChartCategories(
    @Param('chartKey') chartKey: string,
    @Body() body: { 
      categories: Array<{
        key: number | string;
        label: string;
        color: string;
        accessible?: boolean;
      }> 
    }
  ) {
    return this.eventsService.updateChartCategories(chartKey, body.categories);
  }

  // ============ ENDPOINTS PARA GESTIÓN DE ASIENTOS ============

  @Post(':eventKey/book')
  async bookSeats(
    @Param('eventKey') eventKey: string,
    @Body() body: { objectIds: string[]; orderId?: string }
  ) {
    return this.eventsService.bookSeats(eventKey, body.objectIds, body.orderId);
  }

  @Post(':eventKey/release')
  async releaseSeats(
    @Param('eventKey') eventKey: string,
    @Body() body: { objectIds: string[] }
  ) {
    return this.eventsService.releaseSeats(eventKey, body.objectIds);
  }

  @Post(':eventKey/hold')
  async holdSeats(
    @Param('eventKey') eventKey: string,
    @Body() body: { objectIds: string[]; holdToken?: string }
  ) {
    return this.eventsService.holdSeats(eventKey, body.objectIds, body.holdToken);
  }

  @Post(':eventKey/change-status')
  async changeObjectStatus(
    @Param('eventKey') eventKey: string,
    @Body() body: { objectIds: string[]; status: string; orderId?: string }
  ) {
    return this.eventsService.changeObjectStatus(eventKey, body.objectIds, body.status, body.orderId);
  }

  // ============ ENDPOINT PRINCIPAL PARA SINCRONIZACIÓN ============

  @Post('venues/create-complete-structure')
  async createCompleteVenueStructure(
    @Body() venueData: {
      name: string;
      eventTitle: string;
      categories: Array<{
        name: string;
        color: string;
        price: number;
      }>;
    }
  ) {
    return this.eventsService.createCompleteVenueStructure(venueData);
  }
}