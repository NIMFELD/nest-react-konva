// NestJS service for events
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EventsService {
  private readonly apiUrl = 'https://api-sa.seatsio.net';
  private readonly secretKey = process.env.SEATSIO_SECRET_KEY;

  // Configuración de axios con autenticación
  private get httpClient() {
    return axios.create({
      baseURL: this.apiUrl,
      auth: {
        username: this.secretKey,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  async getConfig() {
    return {
      publicKey: process.env.SEATSIO_PUBLIC_KEY,
      region: 'sa'
    };
  }

  async getAllEvents() {
    try {
      const response = await this.httpClient.get('/events');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo eventos:', error.response?.data || error.message);
      throw error;
    }
  }

  async createEvent(chartKey: string, eventKey?: string) {
    try {
      const payload = chartKey ? { chartKey } : {};
      if (eventKey) {
        payload['key'] = eventKey;
      }
      
      const response = await this.httpClient.post('/events', payload);
      return response.data;
    } catch (error) {
      console.error('Error creando evento:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============ NUEVOS MÉTODOS PARA CHARTS Y CATEGORÍAS ============

  /**
   * Crear un nuevo chart (mapa/plano)
   */
  async createChart(name?: string, venueType?: string): Promise<any> {
    try {
      const payload: any = {};
      if (name) payload.name = name;
      if (venueType) payload.venueType = venueType;

      const response = await this.httpClient.post('/charts', payload);
      return response.data;
    } catch (error) {
      console.error('Error creando chart:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtener información de un chart
   */
  async getChart(chartKey: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/charts/${chartKey}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo chart:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Listar todas las categorías de un chart
   */
  async getChartCategories(chartKey: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/charts/${chartKey}/categories`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo categorías:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Crear o actualizar categorías en un chart
   */
  async updateChartCategories(chartKey: string, categories: Array<{key: number | string, label: string, color: string, accessible?: boolean}>): Promise<any> {
    try {
      const response = await this.httpClient.post(`/charts/${chartKey}/categories`, {
        categories
      });
      return response.data;
    } catch (error) {
      console.error('Error actualizando categorías:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtener información de un evento específico
   */
  async getEvent(eventKey: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/events/${eventKey}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo evento:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtener todos los objetos (asientos) de un evento con su estado
   */
  async getEventObjects(eventKey: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/reports/events/${eventKey}/byStatus`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo objetos del evento:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cambiar el estado de objetos específicos (reservar/liberar)
   */
  async changeObjectStatus(eventKey: string, objectIds: string[], status: string, orderId?: string): Promise<any> {
    try {
      const payload: any = {
        objects: objectIds,
        status
      };
      
      if (orderId) {
        payload.orderId = orderId;
      }

      const response = await this.httpClient.post(`/events/${eventKey}/actions/change-object-status`, payload);
      return response.data;
    } catch (error) {
      console.error('Error cambiando estado de objetos:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Reservar asientos (equivalente a booking)
   */
  async bookSeats(eventKey: string, objectIds: string[], orderId?: string): Promise<any> {
    return this.changeObjectStatus(eventKey, objectIds, 'booked', orderId);
  }

  /**
   * Liberar asientos
   */
  async releaseSeats(eventKey: string, objectIds: string[]): Promise<any> {
    return this.changeObjectStatus(eventKey, objectIds, 'free');
  }

  /**
   * Mantener asientos en hold (temporal)
   */
  async holdSeats(eventKey: string, objectIds: string[], holdToken?: string): Promise<any> {
    try {
      const payload: any = {
        objects: objectIds
      };
      
      if (holdToken) {
        payload.holdToken = holdToken;
      }

      const response = await this.httpClient.post(`/events/${eventKey}/actions/hold`, payload);
      return response.data;
    } catch (error) {
      console.error('Error manteniendo asientos en hold:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============ MÉTODOS DE SINCRONIZACIÓN CON TU BD ============

  /**
   * Crear estructura completa: Chart + Event + Categorías basado en tu EventVenue
   */
  async createCompleteVenueStructure(venueData: {
    name: string;
    eventTitle: string;
    categories: Array<{
      name: string;
      color: string;
      price: number;
    }>;
  }): Promise<{
    chart: any;
    event: any;
    categories: any;
    mapping: Array<{
      venueType: string;
      seatioType: string;
      seatioObjectId: string;
      seatioEventKey: string;
      seatioChartKey: string;
    }>;
  }> {
    try {
      // 1. Crear Chart
      const chart = await this.createChart(venueData.name, 'MIXED');
      
      // 2. Crear Event
      const event = await this.createEvent(chart.key);
      
      // 3. Crear categorías
      const seatioCategories = venueData.categories.map((cat, index) => ({
        key: index + 1,
        label: cat.name,
        color: cat.color,
        accessible: false
      }));
      
      const categories = await this.updateChartCategories(chart.key, seatioCategories);
      
      // 4. Generar mapeo para tu BD
      const mapping = [
        {
          venueType: 'venue',
          seatioType: 'chart',
          seatioObjectId: chart.key,
          seatioEventKey: event.key,
          seatioChartKey: chart.key
        },
        {
          venueType: 'event',
          seatioType: 'event',
          seatioObjectId: event.key,
          seatioEventKey: event.key,
          seatioChartKey: chart.key
        },
        ...seatioCategories.map(cat => ({
          venueType: 'category',
          seatioType: 'category',
          seatioObjectId: cat.key.toString(),
          seatioEventKey: event.key,
          seatioChartKey: chart.key
        }))
      ];

      return {
        chart,
        event,
        categories,
        mapping
      };
    } catch (error) {
      console.error('Error creando estructura completa:', error);
      throw error;
    }
  }
}