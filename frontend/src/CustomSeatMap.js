import React, { useState, useRef } from 'react';
import { Stage, Layer, Circle, Text, Group, Rect } from 'react-konva';

// Tipos de eventos con sus configuraciones de precios
const EVENT_TYPES = {
  concert: {
    name: 'Concierto',
    icon: '🎵',
    priceMultiplier: 1.5,
    seatTypes: {
      vip: { color: '#FFD700', basePrice: 100, name: 'VIP' },
      premium: { color: '#FF6B6B', basePrice: 60, name: 'Premium' },
      general: { color: '#4ECDC4', basePrice: 30, name: 'General' }
    }
  },
  theater: {
    name: 'Teatro',
    icon: '🎭',
    priceMultiplier: 1.0,
    seatTypes: {
      vip: { color: '#FFD700', basePrice: 80, name: 'Palco VIP' },
      premium: { color: '#FF6B6B', basePrice: 50, name: 'Platea Premium' },
      general: { color: '#4ECDC4', basePrice: 25, name: 'Platea General' }
    }
  },
  sports: {
    name: 'Deportes',
    icon: '⚽',
    priceMultiplier: 1.2,
    seatTypes: {
      vip: { color: '#FFD700', basePrice: 120, name: 'Palco VIP' },
      premium: { color: '#FF6B6B', basePrice: 70, name: 'Tribuna Premium' },
      general: { color: '#4ECDC4', basePrice: 35, name: 'Tribuna General' }
    }
  },
  conference: {
    name: 'Conferencia',
    icon: '🎤',
    priceMultiplier: 0.8,
    seatTypes: {
      vip: { color: '#FFD700', basePrice: 60, name: 'VIP Front' },
      premium: { color: '#FF6B6B', basePrice: 40, name: 'Premium' },
      general: { color: '#4ECDC4', basePrice: 20, name: 'General' }
    }
  }
};

// Diferentes venues con sus layouts
const VENUES = {
  teatro_principal: {
    id: 'teatro_principal',
    name: 'Teatro Principal',
    icon: '🏛️',
    capacity: 500,
    sections: [
      {
        id: 'vip',
        name: 'VIP',
        seats: generateSectionSeats('VIP', 150, 80, 4, 8, 50, 40),
        labelPos: { x: 80, y: 100 }
      },
      {
        id: 'premium',
        name: 'Premium',
        seats: generateSectionSeats('Premium', 120, 240, 4, 10, 50, 40),
        labelPos: { x: 50, y: 260 }
      },
      {
        id: 'general',
        name: 'General',
        seats: generateSectionSeats('General', 100, 400, 6, 12, 50, 35),
        labelPos: { x: 30, y: 420 }
      }
    ]
  },
  arena_deportiva: {
    id: 'arena_deportiva',
    name: 'Arena Deportiva',
    icon: '🏟️',
    capacity: 800,
    sections: [
      {
        id: 'vip',
        name: 'VIP',
        seats: generateSectionSeats('VIP', 200, 90, 3, 6, 55, 45),
        labelPos: { x: 130, y: 110 }
      },
      {
        id: 'premium',
        name: 'Premium',
        seats: generateSectionSeats('Premium', 100, 250, 6, 14, 45, 40),
        labelPos: { x: 30, y: 270 }
      },
      {
        id: 'general',
        name: 'General',
        seats: generateSectionSeats('General', 60, 420, 8, 16, 42, 35),
        labelPos: { x: 10, y: 440 }
      }
    ]
  },
  auditorio_pequeno: {
    id: 'auditorio_pequeno',
    name: 'Auditorio Pequeño',
    icon: '🎪',
    capacity: 200,
    sections: [
      {
        id: 'vip',
        name: 'VIP',
        seats: generateSectionSeats('VIP', 220, 120, 3, 4, 55, 45),
        labelPos: { x: 150, y: 140 }
      },
      {
        id: 'premium',
        name: 'Premium',
        seats: generateSectionSeats('Premium', 180, 270, 4, 6, 50, 40),
        labelPos: { x: 110, y: 290 }
      },
      {
        id: 'general',
        name: 'General',
        seats: generateSectionSeats('General', 140, 420, 5, 8, 45, 35),
        labelPos: { x: 70, y: 440 }
      }
    ]
  },
  estadio_grande: {
    id: 'estadio_grande',
    name: 'Estadio Grande',
    icon: '🏟️',
    capacity: 1200,
    sections: [
      {
        id: 'vip',
        name: 'VIP',
        seats: generateSectionSeats('VIP', 150, 80, 2, 10, 45, 45),
        labelPos: { x: 80, y: 100 }
      },
      {
        id: 'premium',
        name: 'Premium',
        seats: generateSectionSeats('Premium', 80, 200, 8, 16, 40, 35),
        labelPos: { x: 20, y: 220 }
      },
      {
        id: 'general',
        name: 'General',
        seats: generateSectionSeats('General', 50, 380, 10, 18, 38, 32),
        labelPos: { x: 5, y: 400 }
      }
    ]
  }
};

function generateSectionSeats(sectionName, startX, startY, rows, seatsPerRow, seatWidth, seatHeight) {
  const seats = [];
  for (let row = 0; row < rows; row++) {
    for (let seat = 0; seat < seatsPerRow; seat++) {
      seats.push({
        id: `${sectionName.toLowerCase()}-${row + 1}-${seat + 1}`,
        x: startX + seat * seatWidth,
        y: startY + row * seatHeight,
        row: String.fromCharCode(65 + row),
        seat: seat + 1,
        label: `${String.fromCharCode(65 + row)}${seat + 1}`,
        sectionName: sectionName,
        section: sectionName.toLowerCase()
      });
    }
  }
  return seats;
}

const CustomSeatMap = ({ onSelectionChange, eventData }) => {
  const stageRef = useRef();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [occupiedSeats, setOccupiedSeats] = useState(new Set(['vip-1-3', 'premium-2-5', 'general-3-7']));
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  
  // Estados para venue y tipo de evento
  const [selectedVenue, setSelectedVenue] = useState('teatro_principal');
  const [selectedEventType, setSelectedEventType] = useState('theater');

  const currentVenue = VENUES[selectedVenue];
  const currentEventType = EVENT_TYPES[selectedEventType];

  // Función para calcular precio basado en evento y asiento
  const calculateSeatPrice = (seatSection) => {
    const basePrice = currentEventType.seatTypes[seatSection].basePrice;
    return Math.round(basePrice * currentEventType.priceMultiplier);
  };

  // Función para obtener configuración de asiento
  const getSeatConfig = (seatSection) => {
    return {
      ...currentEventType.seatTypes[seatSection],
      price: calculateSeatPrice(seatSection)
    };
  };

  const getAllSeats = () => {
    return currentVenue?.sections.flatMap(section => 
      section.seats.map(seat => ({
        ...seat,
        ...getSeatConfig(seat.section),
        price: calculateSeatPrice(seat.section)
      }))
    ) || [];
  };

  const handleSeatClick = (seat) => {
    if (occupiedSeats.has(seat.id)) {
      alert('Este asiento ya está ocupado');
      return;
    }

    const isSelected = selectedSeats.find(s => s.id === seat.id);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedSeats.filter(s => s.id !== seat.id);
    } else {
      if (selectedSeats.length >= 8) {
        alert('Máximo 8 asientos por reserva');
        return;
      }
      newSelection = [...selectedSeats, seat];
    }
    
    setSelectedSeats(newSelection);
    onSelectionChange?.(newSelection);
  };

  const getSeatColor = (seat) => {
    if (occupiedSeats.has(seat.id)) return '#888888';
    if (selectedSeats.find(s => s.id === seat.id)) return '#FF0080';
    return getSeatConfig(seat.section).color;
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.5, Math.min(3, newScale));
    
    setScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  // Resetear selección cuando cambie venue o evento
  const handleVenueChange = (venueId) => {
    setSelectedVenue(venueId);
    setSelectedSeats([]);
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  const handleEventTypeChange = (eventType) => {
    setSelectedEventType(eventType);
    setSelectedSeats([]);
  };

  return (
    <div className="custom-seatmap-container">
      {/* Selectores de venue y evento */}
      <div className="venue-event-selectors">
        <div className="selector-group">
          <h4>📍 Seleccionar Venue</h4>
          <select 
            value={selectedVenue} 
            onChange={(e) => handleVenueChange(e.target.value)}
            className="venue-select"
          >
            {Object.values(VENUES).map(venue => (
              <option key={venue.id} value={venue.id}>
                {venue.icon} {venue.name} (Cap: {venue.capacity})
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          <h4>🎪 Tipo de Evento</h4>
          <select 
            value={selectedEventType} 
            onChange={(e) => handleEventTypeChange(e.target.value)}
            className="event-select"
          >
            {Object.entries(EVENT_TYPES).map(([key, eventType]) => (
              <option key={key} value={key}>
                {eventType.icon} {eventType.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Información del venue y evento */}
      <div className="seatmap-info">
        <div className="venue-event-info">
          <h3>{currentVenue.icon} {currentVenue.name} • {currentEventType.icon} {currentEventType.name}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">📍 Capacidad:</span>
              <span className="info-value">{currentVenue.capacity} asientos</span>
            </div>
            <div className="info-item">
              <span className="info-label">🎟️ Selección:</span>
              <span className="info-value">Máximo 8 asientos</span>
            </div>
            <div className="info-item">
              <span className="info-label">🔍 Navegación:</span>
              <span className="info-value">Scroll para zoom • Arrastra para mover</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de zoom */}
      <div className="seatmap-controls">
        <button 
          className="control-btn"
          onClick={() => setScale(Math.max(0.5, scale - 0.1))}
        >
          🔍-
        </button>
        <span style={{ margin: '0 10px', color: 'white', fontWeight: 'bold' }}>
          {Math.round(scale * 100)}%
        </span>
        <button 
          className="control-btn"
          onClick={() => setScale(Math.min(3, scale + 0.1))}
        >
          🔍+
        </button>
        <button 
          className="control-btn"
          onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }); }}
        >
          ↺ Reset
        </button>
      </div>

      {/* Canvas principal */}
      <div className="canvas-container">
        <Stage
          width={800}
          height={600}
          onWheel={handleWheel}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          draggable
          ref={stageRef}
          className="main-stage"
        >
          <Layer>
            {/* Fondo del escenario */}
            <Rect
              x={200}
              y={10}
              width={400}
              height={30}
              fill="#2c3e50"
              cornerRadius={5}
            />
            <Text
              x={200}
              y={18}
              text="🎭 ESCENARIO"
              fontSize={16}
              fontFamily="Arial"
              fill="white"
              width={400}
              align="center"
            />

            {/* Asientos */}
            {getAllSeats().map((seat) => (
              <Group key={seat.id}>
                <Circle
                  x={seat.x + 15}
                  y={seat.y + 15}
                  radius={12}
                  fill={getSeatColor(seat)}
                  stroke={selectedSeats.find(s => s.id === seat.id) ? '#fff' : '#333'}
                  strokeWidth={selectedSeats.find(s => s.id === seat.id) ? 3 : 1}
                  onClick={() => handleSeatClick(seat)}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage().container();
                    container.style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage().container();
                    container.style.cursor = 'default';
                  }}
                  shadowColor="black"
                  shadowBlur={2}
                  shadowOpacity={0.3}
                />
                <Text
                  x={seat.x}
                  y={seat.y + 35}
                  text={seat.label}
                  fontSize={10}
                  fontFamily="Arial"
                  fill="#333"
                  width={30}
                  align="center"
                />
              </Group>
            ))}

            {/* Etiquetas de secciones dinámicas */}
            {currentVenue.sections.map((section, index) => (
              <Text
                key={section.id}
                x={section.labelPos?.x || 15 + index * 10}
                y={section.labelPos?.y || section.seats[0]?.y + 20 || 100 + index * 100}
                text={getSeatConfig(section.id).name.toUpperCase()}
                fontSize={14}
                fontFamily="Arial"
                fill={getSeatConfig(section.id).color}
                fontStyle="bold"
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Leyenda dinámica */}
      <div className="seatmap-legend">
        <h4>Leyenda de Precios - {currentEventType.name}</h4>
        <div className="legend-items">
          {Object.entries(currentEventType.seatTypes).map(([key, type]) => (
            <div key={key} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: type.color }}
              ></div>
              <span>{type.name}: ${calculateSeatPrice(key)}</span>
            </div>
          ))}
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#888888' }}></div>
            <span>Ocupado</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FF0080' }}></div>
            <span>Seleccionado</span>
          </div>
        </div>
      </div>

      {/* Resumen de selección */}
      {selectedSeats.length > 0 && (
        <div className="selection-summary">
          <h4>Asientos Seleccionados ({selectedSeats.length}) - {currentEventType.name}</h4>
          <div className="selected-seats-list">
            {selectedSeats.map(seat => (
              <span key={seat.id} className="selected-seat-tag">
                {seat.label} - ${seat.price}
              </span>
            ))}
          </div>
          <div className="total-price">
            <strong>Total: ${selectedSeats.reduce((sum, seat) => sum + seat.price, 0)}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSeatMap; 