// NestJS controller for events
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('config')
  async getConfig() {
    return this.eventsService.getConfig();
  }

  @Get()
  async getAllEvents() {
    return this.eventsService.getAllEvents();
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