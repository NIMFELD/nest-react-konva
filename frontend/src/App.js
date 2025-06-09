import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SeatMap from './SeatMap';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar configuración y eventos al iniciar
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener configuración (public key)
        const configResponse = await axios.get('http://localhost:3001/events/config');
        setConfig(configResponse.data);
        
        // Obtener lista de eventos
        const eventsResponse = await axios.get('http://localhost:3001/events');
        setEvents(eventsResponse.data.items || []);
      } catch (err) {
        setError('Error al cargar datos: ' + err.message);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setSelectedSeats([]);
  };

  const handleSeatSelection = (selectedObjects) => {
    setSelectedSeats(selectedObjects);
    console.log('Asientos seleccionados:', selectedObjects);
  };

  const handleReserveSeats = async () => {
    if (!selectedEvent || selectedSeats.length === 0) return;

    try {
      const seatLabels = selectedSeats.map(seat => seat.label);
      await axios.post(`http://localhost:3001/events/${selectedEvent.key}/reserve`, {
        objects: seatLabels
      });
      alert(`${selectedSeats.length} asiento(s) reservado(s) exitosamente!`);
      setSelectedSeats([]);
    } catch (err) {
      alert('Error al reservar asientos: ' + err.message);
    }
  };

  const handleBookSeats = async () => {
    if (!selectedEvent || selectedSeats.length === 0) return;

    try {
      const seatLabels = selectedSeats.map(seat => seat.label);
      await axios.post(`http://localhost:3001/events/${selectedEvent.key}/book`, {
        objects: seatLabels
      });
      alert(`${selectedSeats.length} asiento(s) comprado(s) exitosamente!`);
      setSelectedSeats([]);
    } catch (err) {
      alert('Error al comprar asientos: ' + err.message);
    }
  };

  const createSampleEvent = async () => {
    try {
      // Formato correcto según la documentación de Seat.io
      const eventData = {
        chartKey: 'fa777d41-5cc1-4e5f-986d-a1aa560700b7', // Tu Chart Key real
        eventKey: 'evento-' + Date.now(),
        name: 'Evento de Prueba - ' + new Date().toLocaleDateString(),
        date: new Date().toISOString().split('T')[0] // Formato yyyy-MM-dd
      };
      
      const response = await axios.post('http://localhost:3001/events', eventData);
      
      // Actualizar la lista de eventos
      const updatedEvents = await axios.get('http://localhost:3001/events');
      setEvents(updatedEvents.data.items || []);
      
      alert('Evento creado exitosamente!');
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Error al crear evento: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <h2>Cargando Seat.io POC...</h2>
          <p>Asegúrate de que el backend esté ejecutándose en el puerto 3001</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎫 Seat.io POC</h1>
        <p>Prueba de concepto para reserva de asientos</p>
      </header>

      <div className="app-content">
        <div className="sidebar">
          <div className="events-section">
            <h3>📅 Eventos Disponibles</h3>
            {events.length === 0 ? (
              <div className="no-events">
                <p>No hay eventos disponibles</p>
                <button onClick={createSampleEvent} className="btn btn-primary">
                  Crear Evento de Prueba
                </button>
              </div>
            ) : (
              <div className="events-list">
                {events.map((event) => (
                  <div
                    key={event.key}
                    className={`event-item ${selectedEvent?.key === event.key ? 'selected' : ''}`}
                    onClick={() => handleEventSelect(event)}
                  >
                    <h4>{event.name || event.key}</h4>
                    <p>Clave: {event.key}</p>
                    <p>Fecha: {event.date || 'No definida'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedSeats.length > 0 && (
            <div className="selected-seats">
              <h3>🪑 Asientos Seleccionados</h3>
              <div className="seats-list">
                {selectedSeats.map((seat, index) => (
                  <span key={index} className="seat-label">
                    {seat.label}
                  </span>
                ))}
              </div>
              <div className="seat-actions">
                <button 
                  onClick={handleReserveSeats} 
                  className="btn btn-warning"
                >
                  🔒 Reservar ({selectedSeats.length})
                </button>
                <button 
                  onClick={handleBookSeats} 
                  className="btn btn-success"
                >
                  💳 Comprar ({selectedSeats.length})
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="main-content">
          {selectedEvent && config ? (
            <div className="seatmap-container">
              <h2>Mapa de Asientos - {selectedEvent.name || selectedEvent.key}</h2>
              <SeatMap
                publicKey={config.publicKey}
                eventKey={selectedEvent.key}
                onSelectionChange={handleSeatSelection}
              />
            </div>
          ) : (
            <div className="no-event-selected">
              <h2>Selecciona un evento</h2>
              <p>Elige un evento de la lista para ver el mapa de asientos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
