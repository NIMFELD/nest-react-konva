import { Injectable } from '@nestjs/common';
import { EventsService } from './events.service';

// Interfaces que representan tu modelo EventVenue
interface EventVenueData {
  id: string;
  name: string;
  priceGeneral: number;
  discount: number;
  price: number;
  root: boolean;
  seat?: string;
  
  // Campos de integración con Seat.io
  seatioObjectId?: string;
  seatioType?: string;
  seatioEventKey?: string;
  seatioChartKey?: string;
  seatioStatus?: string;
  seatioMetadata?: any;
  
  // Jerarquía
  parentId?: string;
  children?: EventVenueData[];
  
  eventId: string;
}

interface EventData {
  id: string;
  title: string;
  name: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  location: string;
  eventVenues: EventVenueData[];
}

@Injectable()
export class VenueSyncService {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Estrategia 1: Crear todo desde cero
   * Ideal para eventos nuevos
   */
  async createEventWithVenues(eventData: EventData): Promise<{
    seatioChart: any;
    seatioEvent: any;
    venueMapping: Array<{
      localVenueId: string;
      seatioData: any;
    }>;
  }> {
    try {
      // 1. Extraer categorías de los venues raíz
      const rootVenues = eventData.eventVenues.filter(v => v.root);
      const categories = rootVenues.map((venue, index) => ({
        name: venue.name,
        color: this.generateColor(index),
        price: venue.price
      }));

      // 2. Crear estructura completa en Seat.io
      const seatioStructure = await this.eventsService.createCompleteVenueStructure({
        name: eventData.venue || eventData.title,
        eventTitle: eventData.title,
        categories
      });

      // 3. Mapear venues locales con Seat.io
      const venueMapping = [];

      // Mapear el venue principal
      if (eventData.eventVenues.length > 0) {
        venueMapping.push({
          localVenueId: eventData.id,
          seatioData: {
            seatioObjectId: seatioStructure.chart.key,
            seatioType: 'chart',
            seatioEventKey: seatioStructure.event.key,
            seatioChartKey: seatioStructure.chart.key,
            seatioStatus: 'active',
            seatioMetadata: {
              chartName: seatioStructure.chart.name,
              createdAt: new Date()
            }
          }
        });
      }

      // Mapear categorías/sectores
      rootVenues.forEach((venue, index) => {
        const categoryKey = (index + 1).toString();
        venueMapping.push({
          localVenueId: venue.id,
          seatioData: {
            seatioObjectId: categoryKey,
            seatioType: 'category',
            seatioEventKey: seatioStructure.event.key,
            seatioChartKey: seatioStructure.chart.key,
            seatioStatus: 'active',
            seatioMetadata: {
              categoryName: venue.name,
              price: venue.price,
              createdAt: new Date()
            }
          }
        });
      });

      return {
        seatioChart: seatioStructure.chart,
        seatioEvent: seatioStructure.event,
        venueMapping
      };

    } catch (error) {
      console.error('Error creando evento con venues:', error);
      throw error;
    }
  }

  /**
   * Estrategia 2: Sincronizar evento existente
   * Para eventos que ya existen en tu BD pero no en Seat.io
   */
  async syncExistingEvent(eventData: EventData, seatioEventKey?: string): Promise<any> {
    try {
      let seatioEvent;

      if (seatioEventKey) {
        // Obtener evento existente
        seatioEvent = await this.eventsService.getEvent(seatioEventKey);
      } else {
        // Crear nuevo evento usando el primer chart disponible
        // En producción, aquí deberías manejar la selección del chart apropiado
        seatioEvent = await this.eventsService.createEvent(process.env.SEATSIO_CHART_KEY);
      }

      // Obtener estado actual de los asientos
      const eventObjects = await this.eventsService.getEventObjects(seatioEvent.key);

      // Sincronizar estados basado en tu base de datos
      const syncOperations = [];

      for (const venue of eventData.eventVenues) {
        if (venue.seat && venue.seatioObjectId) {
          // Determinar estado basado en tu lógica de negocio
          const shouldBeBooked = this.determineBookingStatus(venue);
          
          if (shouldBeBooked) {
            syncOperations.push(
              this.eventsService.bookSeats(seatioEvent.key, [venue.seatioObjectId], venue.id)
            );
          }
        }
      }

      // Ejecutar operaciones de sincronización
      await Promise.all(syncOperations);

      return {
        seatioEvent,
        syncedVenues: eventData.eventVenues.length,
        operationsExecuted: syncOperations.length
      };

    } catch (error) {
      console.error('Error sincronizando evento existente:', error);
      throw error;
    }
  }

  /**
   * Estrategia 3: Sincronización bidireccional
   * Mantener ambos sistemas sincronizados
   */
  async bidirectionalSync(eventId: string): Promise<any> {
    try {
      // 1. Obtener datos de tu BD (aquí usarías tu ORM/Prisma)
      const localEvent = await this.getLocalEvent(eventId);
      
      // 2. Obtener datos de Seat.io
      const seatioEvent = await this.eventsService.getEvent(localEvent.seatioEventKey);
      const seatioObjects = await this.eventsService.getEventObjects(localEvent.seatioEventKey);

      // 3. Detectar diferencias
      const differences = this.detectDifferences(localEvent, seatioObjects);

      // 4. Aplicar cambios según prioridad (Seat.io como fuente de verdad para estados)
      const syncActions = [];

      for (const diff of differences) {
        switch (diff.type) {
          case 'status_mismatch':
            // Actualizar tu BD con el estado de Seat.io
            syncActions.push(this.updateLocalVenueStatus(diff.venueId, diff.seatioStatus));
            break;
          case 'missing_in_seatsio':
            // Crear objeto en Seat.io
            syncActions.push(this.createSeatioObject(diff.venue));
            break;
          case 'missing_locally':
            // Crear venue local
            syncActions.push(this.createLocalVenue(diff.seatioObject));
            break;
        }
      }

      await Promise.all(syncActions);

      return {
        eventId,
        differencesFound: differences.length,
        actionsExecuted: syncActions.length,
        lastSyncAt: new Date()
      };

    } catch (error) {
      console.error('Error en sincronización bidireccional:', error);
      throw error;
    }
  }

  // ============ MÉTODOS AUXILIARES ============

  private generateColor(index: number): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    return colors[index % colors.length];
  }

  private determineBookingStatus(venue: EventVenueData): boolean {
    // Aquí implementarías tu lógica de negocio
    // Por ejemplo, basado en órdenes, reservas, etc.
    return venue.seatioStatus === 'booked';
  }

  private async getLocalEvent(eventId: string): Promise<EventData> {
    // Aquí usarías tu ORM (Prisma) para obtener el evento
    // return await this.prisma.events.findUnique({
    //   where: { id: eventId },
    //   include: { eventVenues: true }
    // });
    
    throw new Error('Implementar con tu ORM/Prisma');
  }

  private detectDifferences(localEvent: EventData, seatioObjects: any): Array<any> {
    const differences = [];
    
    // Comparar estados entre sistemas
    localEvent.eventVenues.forEach(venue => {
      const seatioObject = seatioObjects[venue.seatioObjectId];
      
      if (!seatioObject) {
        differences.push({
          type: 'missing_in_seatsio',
          venueId: venue.id,
          venue
        });
      } else if (venue.seatioStatus !== seatioObject.status) {
        differences.push({
          type: 'status_mismatch',
          venueId: venue.id,
          localStatus: venue.seatioStatus,
          seatioStatus: seatioObject.status
        });
      }
    });

    return differences;
  }

  private async updateLocalVenueStatus(venueId: string, status: string): Promise<void> {
    // Actualizar en tu BD
    // await this.prisma.eventVenue.update({
    //   where: { id: venueId },
    //   data: { seatioStatus: status }
    // });
  }

  private async createSeatioObject(venue: EventVenueData): Promise<void> {
    // Crear objeto en Seat.io si es necesario
    // Depende del tipo de objeto (seat, category, etc.)
  }

  private async createLocalVenue(seatioObject: any): Promise<void> {
    // Crear venue en tu BD basado en objeto de Seat.io
    // await this.prisma.eventVenue.create({
    //   data: {
    //     name: seatioObject.label,
    //     seatioObjectId: seatioObject.id,
    //     seatioType: 'seat',
    //     seatioStatus: seatioObject.status,
    //     // ... otros campos
    //   }
    // });
  }
} 