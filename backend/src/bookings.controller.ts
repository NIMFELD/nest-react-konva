import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';

interface SeatInfo {
  id: string;
  section: string;
  row: string;
  seat: string;
  price: number;
}

interface BookingRequest {
  eventId: string;
  seats: SeatInfo[];
  totalAmount: number;
  customerInfo: {
    name: string;
    email: string;
  };
}

interface Booking {
  id: string;
  eventId: string;
  seats: SeatInfo[];
  totalAmount: number;
  customerInfo: {
    name: string;
    email: string;
  };
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Date;
}

@Controller('bookings')
export class BookingsController {
  private bookings: Booking[] = [];
  private nextId = 1;

  @Get()
  async getAllBookings() {
    return {
      bookings: this.bookings,
      total: this.bookings.length
    };
  }

  @Get(':id')
  async getBooking(@Param('id') id: string) {
    const booking = this.bookings.find(b => b.id === id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    return booking;
  }

  @Post()
  async createBooking(@Body() bookingData: BookingRequest): Promise<Booking> {
    // Validar datos de entrada
    if (!bookingData.eventId || !bookingData.seats || bookingData.seats.length === 0) {
      throw new Error('Invalid booking data');
    }

    // Verificar que no hay asientos duplicados en reservas existentes
    const conflictingSeats = this.findConflictingSeats(bookingData.eventId, bookingData.seats);
    if (conflictingSeats.length > 0) {
      throw new Error(`The following seats are already booked: ${conflictingSeats.join(', ')}`);
    }

    // Crear nueva reserva
    const newBooking: Booking = {
      id: `BK${this.nextId++}`,
      eventId: bookingData.eventId,
      seats: bookingData.seats,
      totalAmount: bookingData.totalAmount,
      customerInfo: bookingData.customerInfo,
      status: 'confirmed',
      createdAt: new Date()
    };

    this.bookings.push(newBooking);

    console.log('New booking created:', {
      id: newBooking.id,
      eventId: newBooking.eventId,
      seatsCount: newBooking.seats.length,
      total: newBooking.totalAmount
    });

    return newBooking;
  }

  @Get('event/:eventId')
  async getBookingsByEvent(@Param('eventId') eventId: string) {
    const eventBookings = this.bookings.filter(b => b.eventId === eventId);
    return {
      eventId,
      bookings: eventBookings,
      totalBookings: eventBookings.length,
      totalRevenue: eventBookings.reduce((sum, b) => sum + b.totalAmount, 0)
    };
  }

  @Get('event/:eventId/occupied-seats')
  async getOccupiedSeats(@Param('eventId') eventId: string) {
    const eventBookings = this.bookings.filter(b => 
      b.eventId === eventId && b.status === 'confirmed'
    );
    
    const occupiedSeats = eventBookings.flatMap(booking => 
      booking.seats.map(seat => seat.id)
    );

    return {
      eventId,
      occupiedSeats,
      totalOccupied: occupiedSeats.length
    };
  }

  @Post(':id/cancel')
  async cancelBooking(@Param('id') id: string) {
    const booking = this.bookings.find(b => b.id === id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.status = 'cancelled';
    
    console.log('Booking cancelled:', {
      id: booking.id,
      seatsReleased: booking.seats.length
    });

    return {
      message: 'Booking cancelled successfully',
      booking
    };
  }

  private findConflictingSeats(eventId: string, newSeats: SeatInfo[]): string[] {
    const existingBookings = this.bookings.filter(b => 
      b.eventId === eventId && b.status === 'confirmed'
    );
    
    const occupiedSeatIds = new Set(
      existingBookings.flatMap(booking => booking.seats.map(seat => seat.id))
    );
    
    return newSeats
      .filter(seat => occupiedSeatIds.has(seat.id))
      .map(seat => seat.id);
  }

  // Endpoint para estadísticas
  @Get('stats/summary')
  async getBookingStats() {
    const confirmedBookings = this.bookings.filter(b => b.status === 'confirmed');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalSeats = confirmedBookings.reduce((sum, b) => sum + b.seats.length, 0);

    return {
      totalBookings: confirmedBookings.length,
      totalRevenue,
      totalSeatsBooked: totalSeats,
      averageBookingValue: confirmedBookings.length > 0 ? totalRevenue / confirmedBookings.length : 0,
      averageSeatsPerBooking: confirmedBookings.length > 0 ? totalSeats / confirmedBookings.length : 0
    };
  }
} 