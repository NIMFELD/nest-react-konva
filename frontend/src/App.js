import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SeatMap from './SeatMap';
import CustomSeatMap from './CustomSeatMap';
import './App.css';

const App = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [useCustomImplementation, setUseCustomImplementation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API Configuration
  const API_BASE_URL = 'http://localhost:3001';
  const SEAT_IO_CONFIG = {
    publicKey: '4e399bc2-e0d6-4fd0-8fcf-ff288651454e',
    eventKey: '8b0f4eef-88c1-41ce-ab54-86789315c4be'
  };

  // Mock events como fallback
  const mockEvents = [
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

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/events`);
      console.log('✅ Eventos cargados desde API:', response.data);
      setEvents(response.data);
      
      // Auto-seleccionar el primer evento si existe
      if (response.data.length > 0) {
        setSelectedEvent(response.data[0]);
      }
    } catch (error) {
      console.warn('⚠️ Backend no disponible, usando eventos mock:', error.message);
      
      // Usar eventos mock como fallback
      setEvents(mockEvents);
      setSelectedEvent(mockEvents[0]);
      
      // No mostrar error, sino un mensaje informativo
      console.log('🎭 Usando eventos de demostración');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventId) => {
    const event = events.find(e => e.id === eventId);
    setSelectedEvent(event);
    setSelectedSeats([]); // Reset seat selection
  };

  const handleSeatSelectionChange = (seats) => {
    console.log('Selección actualizada:', seats);
    setSelectedSeats(seats);
  };

  const handleBookingSubmit = async () => {
    if (selectedSeats.length === 0) {
      alert('Por favor selecciona al menos un asiento');
      return;
    }

    try {
      const bookingData = {
        eventId: selectedEvent?.id,
        seats: selectedSeats.map(seat => ({
          id: seat.id || seat,
          section: seat.section || 'general',
          row: seat.row || 'A',
          seat: seat.seat || '1',
          price: seat.price || 50
        })),
        totalAmount: useCustomImplementation 
          ? selectedSeats.reduce((sum, seat) => sum + (seat.price || 50), 0)
          : selectedSeats.length * 50,
        customerInfo: {
          name: 'Cliente Test',
          email: 'test@example.com'
        }
      };

      console.log('Enviando reserva:', bookingData);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/bookings`, bookingData);
        alert(`¡Reserva exitosa! ID: ${response.data.id}`);
      } catch (apiError) {
        // Si el backend no está disponible, simular respuesta exitosa
        console.warn('Backend no disponible, simulando reserva exitosa');
        alert(`¡Reserva simulada exitosa! Total: $${bookingData.totalAmount}`);
      }
      
      setSelectedSeats([]);
      
    } catch (error) {
      console.error('Error en la reserva:', error);
      alert('Error al procesar la reserva');
    }
  };

  const getTotalPrice = () => {
    if (useCustomImplementation) {
      return selectedSeats.reduce((sum, seat) => sum + (seat.price || 50), 0);
    }
    return selectedSeats.length * 50; // Precio fijo para Seat.io
  };

  if (loading) {
    return (
      <div className="seatmap-loading">
        <div className="loading-spinner"></div>
        Cargando eventos...
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎭 Sistema de Reserva de Asientos</h1>
        <p>Comparación: Seat.io vs Implementación Personalizada (Konva.js)</p>
        {events === mockEvents && (
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            🎪 Modo demo - Backend no conectado
          </p>
        )}
      </header>

      {/* Toggle para cambiar entre implementaciones */}
      <div className="implementation-toggle">
        <button 
          className={`toggle-btn ${!useCustomImplementation ? 'active' : ''}`}
          onClick={() => setUseCustomImplementation(false)}
        >
          🌐 Seat.io (Original)
        </button>
        <button 
          className={`toggle-btn ${useCustomImplementation ? 'active' : ''}`}
          onClick={() => setUseCustomImplementation(true)}
        >
          🎨 Custom (Konva.js)
        </button>
      </div>

      {/* Selector de eventos */}
      <div className="event-selector">
        <h3>Seleccionar Evento:</h3>
        <select 
          value={selectedEvent?.id || ''} 
          onChange={(e) => handleEventChange(e.target.value)}
          className="event-select"
        >
          <option value="">Selecciona un evento</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.name} - {new Date(event.date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* Información del evento seleccionado */}
      {selectedEvent && (
        <div className="event-info">
          <div className="event-details">
            <h2>{selectedEvent.name}</h2>
            <p><strong>Fecha:</strong> {new Date(selectedEvent.date).toLocaleDateString()}</p>
            <p><strong>Venue:</strong> {selectedEvent.venue}</p>
            <p><strong>Descripción:</strong> {selectedEvent.description}</p>
          </div>
        </div>
      )}

      {/* Mapa de asientos */}
      <div className="seatmap-section">
        {useCustomImplementation ? (
          <CustomSeatMap 
            onSelectionChange={handleSeatSelectionChange}
            eventData={selectedEvent}
          />
        ) : (
          <SeatMap
            publicKey={SEAT_IO_CONFIG.publicKey}
            eventKey={SEAT_IO_CONFIG.eventKey}
            onSelectionChange={handleSeatSelectionChange}
          />
        )}
      </div>

      {/* Panel de reserva */}
      {selectedSeats.length > 0 && (
        <div className="booking-panel">
          <div className="booking-summary">
            <h3>Resumen de Reserva</h3>
            <div className="booking-details">
              <p><strong>Evento:</strong> {selectedEvent?.name}</p>
              <p><strong>Asientos seleccionados:</strong> {selectedSeats.length}</p>
              <p><strong>Total:</strong> ${getTotalPrice()}</p>
            </div>
            
            {useCustomImplementation && (
              <div className="seat-breakdown">
                <h4>Detalle de asientos:</h4>
                {selectedSeats.map((seat, index) => (
                  <div key={index} className="seat-detail">
                    {seat.sectionName} - {seat.label} - ${seat.price}
                  </div>
                ))}
              </div>
            )}
            
            <button 
              onClick={handleBookingSubmit}
              className="book-button"
            >
              🎫 Confirmar Reserva (${getTotalPrice()})
            </button>
          </div>
        </div>
      )}

      {/* Comparación de características */}
      <div className="features-comparison">
        <h3>Comparación de Características</h3>
        <div className="comparison-grid">
          <div className="comparison-item">
            <h4>🌐 Seat.io</h4>
            <ul>
              <li>✅ Plug & Play</li>
              <li>✅ Hosting incluido</li>
              <li>✅ Soporte profesional</li>
              <li>❌ Costo mensual</li>
              <li>❌ Personalización limitada</li>
              <li>❌ Dependencia externa</li>
            </ul>
          </div>
          <div className="comparison-item">
            <h4>🎨 Custom (Konva.js)</h4>
            <ul>
              <li>✅ Completamente personalizable</li>
              <li>✅ Sin costos recurrentes</li>
              <li>✅ Control total</li>
              <li>✅ Mejor performance</li>
              <li>❌ Desarrollo inicial</li>
              <li>❌ Mantenimiento propio</li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="App-footer">
        <p>Demostración técnica - NestJS + React + {useCustomImplementation ? 'Konva.js' : 'Seat.io'}</p>
      </footer>
    </div>
  );
};

export default App;
