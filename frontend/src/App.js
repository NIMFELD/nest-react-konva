import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SeatMap from './SeatMap';
import CustomSeatMap from './CustomSeatMap';
import SeatMapEditor from './SeatMapEditor';
import './App.css';

const App = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [useCustomImplementation, setUseCustomImplementation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('viewer'); // 'viewer' or 'editor'

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
        <p>Alternativa gratuita y completa a Seat.io - Crea y gestiona mapas de asientos</p>
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'viewer' ? 'active' : ''}`}
          onClick={() => setActiveTab('viewer')}
        >
          👁️ Visualizador de Asientos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          ✏️ Editor de Mapas
        </button>
      </div>

      {/* Content */}
      <div className="app-content">
        {activeTab === 'viewer' ? (
          <div className="viewer-section">
            <div className="section-header">
              <h2>🎟️ Selección de Asientos</h2>
              <p>Selecciona tu evento, venue y asientos preferidos</p>
            </div>
            <CustomSeatMap 
              onSelectionChange={handleSeatSelectionChange}
            />
          </div>
        ) : (
          <div className="editor-section">
            <div className="section-header">
              <h2>🎨 Editor de Mapas de Asientos</h2>
              <p>Crea mapas personalizados basados en imágenes reales de venues</p>
            </div>
            <SeatMapEditor />
          </div>
        )}
      </div>

      {/* Features Comparison */}
      <div className="features-comparison">
        <h3>✨ Características de Nuestro Sistema</h3>
        <div className="comparison-grid">
          <div className="comparison-item">
            <h4>🎭 Visualizador Dinámico</h4>
            <ul>
              <li>✅ 4 venues predefinidos</li>
              <li>✅ 4 tipos de eventos con precios dinámicos</li>
              <li>✅ Zoom y navegación fluida</li>
              <li>✅ Selección hasta 8 asientos</li>
              <li>✅ Precios calculados automáticamente</li>
            </ul>
          </div>
          <div className="comparison-item">
            <h4>🎨 Editor Profesional</h4>
            <ul>
              <li>✅ Subida de imágenes de fondo</li>
              <li>✅ Colocación manual de asientos</li>
              <li>✅ 4 tipos de asientos (VIP, Premium, General, Accesible)</li>
              <li>✅ Exportar/Importar configuraciones</li>
              <li>✅ Estadísticas en tiempo real</li>
            </ul>
          </div>
          <div className="comparison-item">
            <h4>💰 Comparación vs Seat.io</h4>
            <ul>
              <li>🔥 <strong>Seat.io:</strong> $99-299/mes</li>
              <li>✅ <strong>Nuestro sistema:</strong> Completamente GRATIS</li>
              <li>✅ Sin límites de venues</li>
              <li>✅ Sin límites de asientos</li>
              <li>✅ Código abierto y personalizable</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="App-footer">
        <p>💡 Sistema desarrollado con React + Konva.js + NestJS</p>
      </footer>
    </div>
  );
};

export default App;
