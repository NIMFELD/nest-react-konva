import { useState, useEffect } from 'react';

// Venues predefinidos
const DEFAULT_VENUES = {
  teatro_principal: {
    id: 'teatro_principal',
    name: 'Teatro Principal',
    icon: '🏛️',
    capacity: 500,
    isCustom: false,
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
    isCustom: false,
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
    isCustom: false,
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
    isCustom: false,
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

const useVenues = () => {
  const [venues, setVenues] = useState(DEFAULT_VENUES);
  const [customVenues, setCustomVenues] = useState([]);

  // Cargar venues personalizados del localStorage al inicializar
  useEffect(() => {
    const savedVenues = localStorage.getItem('customVenues');
    if (savedVenues) {
      try {
        const parsed = JSON.parse(savedVenues);
        setCustomVenues(parsed);
        
        // Combinar venues por defecto con personalizados
        const combined = { ...DEFAULT_VENUES };
        parsed.forEach(venue => {
          combined[venue.id] = venue;
        });
        setVenues(combined);
      } catch (error) {
        console.error('Error al cargar venues personalizados:', error);
      }
    }
  }, []);

  // Guardar venue personalizado
  const saveCustomVenue = (venueData) => {
    const venueId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const customVenue = {
      ...venueData,
      id: venueId,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    // Actualizar lista de venues personalizados
    const updatedCustomVenues = [...customVenues, customVenue];
    setCustomVenues(updatedCustomVenues);

    // Actualizar venues combinados
    const updatedVenues = {
      ...venues,
      [venueId]: customVenue
    };
    setVenues(updatedVenues);

    // Guardar en localStorage
    localStorage.setItem('customVenues', JSON.stringify(updatedCustomVenues));

    return venueId;
  };

  // Eliminar venue personalizado
  const deleteCustomVenue = (venueId) => {
    if (!venues[venueId]?.isCustom) {
      console.error('No se puede eliminar un venue predefinido');
      return false;
    }

    // Actualizar venues personalizados
    const updatedCustomVenues = customVenues.filter(v => v.id !== venueId);
    setCustomVenues(updatedCustomVenues);

    // Actualizar venues combinados
    const updatedVenues = { ...venues };
    delete updatedVenues[venueId];
    setVenues(updatedVenues);

    // Guardar en localStorage
    localStorage.setItem('customVenues', JSON.stringify(updatedCustomVenues));

    return true;
  };

  // Obtener todos los venues
  const getAllVenues = () => {
    return venues;
  };

  // Obtener venue por ID
  const getVenueById = (id) => {
    return venues[id];
  };

  // Obtener solo venues personalizados
  const getCustomVenues = () => {
    return customVenues;
  };

  // Obtener estadísticas
  const getVenueStats = () => {
    const totalVenues = Object.keys(venues).length;
    const customCount = customVenues.length;
    const defaultCount = totalVenues - customCount;

    return {
      total: totalVenues,
      custom: customCount,
      default: defaultCount
    };
  };

  return {
    venues,
    customVenues,
    saveCustomVenue,
    deleteCustomVenue,
    getAllVenues,
    getVenueById,
    getCustomVenues,
    getVenueStats
  };
};

export default useVenues; 