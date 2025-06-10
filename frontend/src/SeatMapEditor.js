import React, { useState, useRef, useCallback } from 'react';
import { Stage, Layer, Circle, Text, Group, Rect, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import SeatDetector from './SeatDetector';
import useVenues from './hooks/useVenues';

// Tipos de asientos disponibles
const SEAT_TYPES = {
  vip: { color: '#FFD700', price: 150, name: 'VIP', size: 14 },
  premium: { color: '#FF6B6B', price: 100, name: 'Premium', size: 12 },
  general: { color: '#4ECDC4', price: 50, name: 'General', size: 10 },
  accessible: { color: '#9B59B6', price: 75, name: 'Accesible', size: 16 }
};

const BackgroundImage = ({ src, onLoad }) => {
  const [image] = useImage(src);
  
  React.useEffect(() => {
    if (image && onLoad) {
      onLoad(image);
    }
  }, [image, onLoad]);

  return image ? <KonvaImage image={image} /> : null;
};

const SeatMapEditor = () => {
  const stageRef = useRef();
  const fileInputRef = useRef();
  const seatDetector = useRef(new SeatDetector());
  const { saveCustomVenue } = useVenues();
  
  // Estados principales
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [seats, setSeats] = useState([]);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [selectedSeatType, setSelectedSeatType] = useState('general');
  const [isEditorMode, setIsEditorMode] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [stageDimensions, setStageDimensions] = useState({ width: 800, height: 600 });
  
  // Estados para detección automática
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedSeats, setDetectedSeats] = useState([]);
  const [showDetected, setShowDetected] = useState(true);
  const [detectionPattern, setDetectionPattern] = useState('auto');

  // Estados para guardar venue
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [venueForm, setVenueForm] = useState({
    name: '',
    icon: '🏛️',
    description: ''
  });

  // Lista de iconos disponibles para venues
  const venueIcons = ['🏛️', '🎭', '🏟️', '🎪', '🎵', '🎤', '⚽', '🏀', '🎾', '🎬', '🎨', '📍'];

  // Función para manejar la subida de imagen
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target.result);
        // Resetear posición y escala cuando se carga nueva imagen
        setScale(1);
        setStagePos({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para manejar el redimensionamiento automático de la imagen
  const handleImageLoad = useCallback((image) => {
    const maxWidth = 800;
    const maxHeight = 600;
    const imageAspect = image.width / image.height;
    const containerAspect = maxWidth / maxHeight;

    let newWidth, newHeight;
    if (imageAspect > containerAspect) {
      newWidth = maxWidth;
      newHeight = maxWidth / imageAspect;
    } else {
      newHeight = maxHeight;
      newWidth = maxHeight * imageAspect;
    }

    setStageDimensions({ width: newWidth, height: newHeight });
  }, []);

  // Función para agregar asiento en click
  const handleStageClick = (e) => {
    if (!isEditorMode) return;

    const pos = e.target.getStage().getPointerPosition();
    const relativePos = {
      x: (pos.x - stagePos.x) / scale,
      y: (pos.y - stagePos.y) / scale
    };

    const newSeat = {
      id: `seat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: relativePos.x,
      y: relativePos.y,
      type: selectedSeatType,
      row: generateRowLetter(seats.length),
      number: (seats.length % 20) + 1,
      ...SEAT_TYPES[selectedSeatType]
    };

    setSeats([...seats, newSeat]);
  };

  // Función para generar letras de fila
  const generateRowLetter = (index) => {
    return String.fromCharCode(65 + Math.floor(index / 20));
  };

  // Función para manejar selección de asientos en modo visualización
  const handleSeatClick = (seat) => {
    if (isEditorMode) {
      // En modo editor, eliminar asiento
      setSeats(seats.filter(s => s.id !== seat.id));
    } else {
      // En modo visualización, seleccionar/deseleccionar
      const isSelected = selectedSeats.find(s => s.id === seat.id);
      if (isSelected) {
        setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id));
      } else {
        if (selectedSeats.length < 8) {
          setSelectedSeats([...selectedSeats, seat]);
        }
      }
    }
  };

  // Función para zoom con rueda del mouse
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
    const clampedScale = Math.max(0.3, Math.min(5, newScale));
    
    setScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  // Función para exportar configuración
  const exportConfiguration = () => {
    const config = {
      backgroundImage,
      seats,
      stageDimensions,
      metadata: {
        totalSeats: seats.length,
        seatTypes: Object.keys(SEAT_TYPES).reduce((acc, type) => {
          acc[type] = seats.filter(s => s.type === type).length;
          return acc;
        }, {}),
        createdAt: new Date().toISOString()
      }
    };

    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'seat-map-config.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Función para importar configuración
  const importConfiguration = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          setBackgroundImage(config.backgroundImage);
          setSeats(config.seats || []);
          setStageDimensions(config.stageDimensions || { width: 800, height: 600 });
          setScale(1);
          setStagePos({ x: 0, y: 0 });
        } catch (error) {
          alert('Error al importar la configuración: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  // Función para limpiar todo
  const clearAll = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar todo? Esta acción no se puede deshacer.')) {
      setSeats([]);
      setSelectedSeats([]);
    }
  };

  // Función para detección automática de asientos
  const handleAutoDetection = async () => {
    if (!backgroundImage) {
      alert('Primero sube una imagen de fondo');
      return;
    }

    setIsDetecting(true);
    
    try {
      // Crear elemento de imagen temporal
      const img = new Image();
      img.onload = async () => {
        try {
          const detected = await seatDetector.current.detectSeats(img, {
            minRadius: 8,
            maxRadius: 25,
            threshold: 0.3,
            pattern: detectionPattern
          });
          
          setDetectedSeats(detected);
          setShowDetected(true);
          
          console.log(`🎯 Detectados ${detected.length} asientos automáticamente`);
        } catch (error) {
          console.error('Error en detección:', error);
          alert('Error al detectar asientos. Intenta con otra imagen.');
        } finally {
          setIsDetecting(false);
        }
      };
      img.src = backgroundImage;
    } catch (error) {
      console.error('Error al cargar imagen:', error);
      setIsDetecting(false);
    }
  };

  // Aceptar asientos detectados
  const acceptDetectedSeats = () => {
    const newSeats = detectedSeats.map((seat, index) => ({
      ...seat,
      id: `auto-${Date.now()}-${index}`,
      ...SEAT_TYPES[seat.type || 'general']
    }));
    
    setSeats([...seats, ...newSeats]);
    setDetectedSeats([]);
    setShowDetected(false);
  };

  // Rechazar asientos detectados
  const rejectDetectedSeats = () => {
    setDetectedSeats([]);
    setShowDetected(false);
  };

  // Función para mostrar modal de guardado
  const handleSaveVenue = () => {
    if (seats.length === 0) {
      alert('Primero debes colocar algunos asientos en el mapa');
      return;
    }
    setShowSaveModal(true);
  };

  // Función para guardar venue personalizado
  const handleConfirmSaveVenue = () => {
    if (!venueForm.name.trim()) {
      alert('Por favor ingresa un nombre para el venue');
      return;
    }

    try {
      // Convertir asientos al formato de venue
      const venueSeats = seats.map(seat => ({
        id: seat.id,
        x: seat.x,
        y: seat.y,
        row: seat.row,
        seat: seat.number,
        label: seat.row + seat.number,
        sectionName: seat.name,
        section: seat.type,
        type: seat.type
      }));

      // Organizar asientos por tipo/sección
      const sections = {};
      const sectionLabels = {};
      
      seats.forEach(seat => {
        if (!sections[seat.type]) {
          sections[seat.type] = [];
          sectionLabels[seat.type] = {
            x: Math.min(...seats.filter(s => s.type === seat.type).map(s => s.x)) - 30,
            y: Math.min(...seats.filter(s => s.type === seat.type).map(s => s.y)) + 20
          };
        }
        sections[seat.type].push({
          id: seat.id,
          x: seat.x,
          y: seat.y,
          row: seat.row,
          seat: seat.number,
          label: seat.row + seat.number,
          sectionName: seat.name,
          section: seat.type
        });
      });

      const venueData = {
        name: venueForm.name.trim(),
        icon: venueForm.icon,
        description: venueForm.description.trim(),
        capacity: seats.length,
        backgroundImage: backgroundImage,
        stageDimensions: stageDimensions,
        sections: Object.entries(sections).map(([sectionType, sectionSeats]) => ({
          id: sectionType,
          name: sectionType.charAt(0).toUpperCase() + sectionType.slice(1),
          seats: sectionSeats,
          labelPos: sectionLabels[sectionType]
        })),
        metadata: {
          totalSeats: seats.length,
          seatTypes: Object.keys(SEAT_TYPES).reduce((acc, type) => {
            acc[type] = seats.filter(s => s.type === type).length;
            return acc;
          }, {}),
          hasBackgroundImage: !!backgroundImage
        }
      };

      const venueId = saveCustomVenue(venueData);
      
      alert(`¡Venue "${venueForm.name}" guardado exitosamente! 🎉\nAhora aparecerá en el listado de venues del visualizador.`);
      
      // Resetear formulario y cerrar modal
      setVenueForm({ name: '', icon: '🏛️', description: '' });
      setShowSaveModal(false);
      
      console.log('Venue guardado:', { id: venueId, ...venueData });
      
    } catch (error) {
      console.error('Error al guardar venue:', error);
      alert('Error al guardar el venue. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="custom-seatmap-container">
      {/* Modal para guardar venue */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="save-venue-modal">
            <div className="modal-header">
              <h3>💾 Guardar como Venue</h3>
              <button 
                className="modal-close"
                onClick={() => setShowSaveModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>📍 Nombre del Venue:</label>
                <input
                  type="text"
                  value={venueForm.name}
                  onChange={(e) => setVenueForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Teatro Custom, Mi Auditorio..."
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label>🎨 Icono:</label>
                <div className="icon-selector">
                  {venueIcons.map(icon => (
                    <button
                      key={icon}
                      className={`icon-btn ${venueForm.icon === icon ? 'active' : ''}`}
                      onClick={() => setVenueForm(prev => ({ ...prev, icon }))}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>📝 Descripción (opcional):</label>
                <textarea
                  value={venueForm.description}
                  onChange={(e) => setVenueForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción breve del venue..."
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="venue-preview">
                <h4>🔍 Vista Previa:</h4>
                <div className="preview-item">
                  <span className="preview-icon">{venueForm.icon}</span>
                  <div className="preview-info">
                    <strong>{venueForm.name || 'Nombre del Venue'}</strong>
                    <p>Capacidad: {seats.length} asientos</p>
                    {venueForm.description && <p>{venueForm.description}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => setShowSaveModal(false)}
              >
                ❌ Cancelar
              </button>
              <button 
                className="btn-save"
                onClick={handleConfirmSaveVenue}
                disabled={!venueForm.name.trim()}
              >
                💾 Guardar Venue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controles del Editor */}
      <div className="editor-controls">
        <div className="editor-header">
          <h3>🎭 Editor de Mapas de Asientos</h3>
          <button 
            className={`editor-toggle ${isEditorMode ? 'active' : ''}`}
            onClick={() => {
              setIsEditorMode(!isEditorMode);
              setSelectedSeats([]);
            }}
          >
            {isEditorMode ? '✏️ Modo Editor' : '👁️ Modo Vista'}
          </button>
        </div>

        <div className="editor-tools">
          {/* Sección de Imagen */}
          <div className="tool-section">
            <h4>🖼️ Imagen de Fondo</h4>
            <div className="image-controls">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button 
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Subir Imagen
              </button>
              {backgroundImage && (
                <button 
                  className="remove-btn"
                  onClick={() => setBackgroundImage(null)}
                >
                  🗑️ Quitar Imagen
                </button>
              )}
            </div>
          </div>

          {/* Detección Automática */}
          {isEditorMode && backgroundImage && (
            <div className="tool-section">
              <h4>🤖 Detección Automática</h4>
              <div className="detection-controls">
                <select 
                  value={detectionPattern}
                  onChange={(e) => setDetectionPattern(e.target.value)}
                  className="pattern-select"
                >
                  <option value="auto">🎯 Detección Automática</option>
                  <option value="theater">🎭 Patrón Teatro</option>
                  <option value="stadium">🏟️ Patrón Estadio</option>
                  <option value="conference">🎤 Patrón Conferencia</option>
                </select>
                <button 
                  className="detect-btn"
                  onClick={handleAutoDetection}
                  disabled={isDetecting}
                >
                  {isDetecting ? '🔄 Detectando...' : '🎯 Detectar Asientos'}
                </button>
              </div>
              
              {/* Resultados de detección */}
              {detectedSeats.length > 0 && (
                <div className="detection-results">
                  <p>✅ Se detectaron {detectedSeats.length} asientos potenciales</p>
                  <div className="detection-actions">
                    <button className="accept-btn" onClick={acceptDetectedSeats}>
                      ✅ Aceptar Todos
                    </button>
                    <button className="reject-btn" onClick={rejectDetectedSeats}>
                      ❌ Rechazar
                    </button>
                    <label className="toggle-visibility">
                      <input 
                        type="checkbox" 
                        checked={showDetected}
                        onChange={(e) => setShowDetected(e.target.checked)}
                      />
                      👁️ Mostrar detectados
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sección de Tipos de Asientos */}
          {isEditorMode && (
            <div className="tool-section">
              <h4>🪑 Tipo de Asiento</h4>
              <div className="seat-type-selector">
                {Object.entries(SEAT_TYPES).map(([key, type]) => (
                  <button
                    key={key}
                    className={`seat-type-btn ${selectedSeatType === key ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: selectedSeatType === key ? type.color : 'transparent',
                      color: selectedSeatType === key ? 'white' : type.color,
                      borderColor: type.color
                    }}
                    onClick={() => setSelectedSeatType(key)}
                  >
                    {type.name} (${type.price})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Herramientas */}
          <div className="tool-section">
            <h4>🛠️ Herramientas</h4>
            <div className="tools">
              <button 
                className="save-venue-btn"
                onClick={handleSaveVenue}
                disabled={seats.length === 0}
              >
                💾 Guardar como Venue
              </button>
              <button 
                className="clear-btn"
                onClick={clearAll}
                disabled={seats.length === 0}
              >
                🗑️ Limpiar Asientos
              </button>
              <button 
                className="export-btn"
                onClick={exportConfiguration}
                disabled={seats.length === 0}
              >
                📤 Exportar Config
              </button>
              <input
                type="file"
                onChange={importConfiguration}
                accept=".json"
                style={{ display: 'none' }}
                id="import-input"
              />
              <label htmlFor="import-input" className="import-btn">
                📁 Importar Config
              </label>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="tool-section">
            <h4>📊 Estadísticas</h4>
            <div className="stats">
              <p><strong>Total de asientos:</strong> {seats.length}</p>
              {detectedSeats.length > 0 && (
                <p><strong>Detectados automáticamente:</strong> {detectedSeats.length}</p>
              )}
              {Object.entries(SEAT_TYPES).map(([key, type]) => {
                const count = seats.filter(s => s.type === key).length;
                return count > 0 ? (
                  <p key={key}>
                    <span style={{ color: type.color }}>●</span> {type.name}: {count}
                  </p>
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* Instrucciones actualizadas */}
        <div className="instructions">
          <p><strong>Instrucciones:</strong></p>
          <ul>
            <li>📁 Sube una imagen del escenario como fondo</li>
            <li>🤖 Usa detección automática para encontrar asientos</li>
            <li>🪑 Selecciona el tipo de asiento que quieres colocar manualmente</li>
            <li>🖱️ Haz click en el canvas para colocar asientos</li>
            <li>🗑️ En modo editor, click en un asiento lo elimina</li>
            <li>🔍 Usa scroll para hacer zoom y arrastra para mover</li>
            <li>💾 <strong>¡Guarda tu venue personalizado para usarlo después!</strong></li>
            <li>📤 Exporta configuraciones para compartir con otros</li>
          </ul>
        </div>
      </div>

      {/* Canvas Principal */}
      <div className="seatmap-canvas">
        <div className="canvas-controls">
          <div className="zoom-controls">
            <button onClick={() => setScale(Math.max(0.3, scale - 0.1))}>🔍-</button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(Math.min(5, scale + 0.1))}>🔍+</button>
            <button onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }); }}>↺</button>
          </div>
          <div className="canvas-info">
            {isEditorMode ? (
              <span>✏️ Modo Editor - Click para colocar {SEAT_TYPES[selectedSeatType].name}</span>
            ) : (
              <span>👁️ Modo Vista - Seleccionados: {selectedSeats.length}/8</span>
            )}
          </div>
        </div>

        <div className="konva-container">
          <Stage
            width={stageDimensions.width}
            height={stageDimensions.height}
            onWheel={handleWheel}
            scaleX={scale}
            scaleY={scale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={!isEditorMode}
            onClick={handleStageClick}
            ref={stageRef}
          >
            <Layer>
              {/* Imagen de fondo */}
              {backgroundImage && (
                <BackgroundImage 
                  src={backgroundImage} 
                  onLoad={handleImageLoad}
                />
              )}

              {/* Asientos detectados automáticamente */}
              {showDetected && detectedSeats.map((seat, index) => (
                <Group key={`detected-${index}`}>
                  <Circle
                    x={seat.x}
                    y={seat.y}
                    radius={seat.radius || 12}
                    fill="rgba(0, 255, 136, 0.6)"
                    stroke="#00aa44"
                    strokeWidth={2}
                    dash={[5, 5]}
                  />
                  <Text
                    x={seat.x - 15}
                    y={seat.y + 20}
                    text={`${seat.row || 'A'}${seat.number || index + 1}`}
                    fontSize={9}
                    fontFamily="Arial"
                    fill="#00aa44"
                    width={30}
                    align="center"
                  />
                </Group>
              ))}

              {/* Asientos colocados manualmente */}
              {seats.map((seat) => {
                const isSelected = selectedSeats.find(s => s.id === seat.id);
                const seatColor = isSelected ? '#FF0080' : seat.color;
                
                return (
                  <Group key={seat.id}>
                    <Circle
                      x={seat.x}
                      y={seat.y}
                      radius={seat.size}
                      fill={seatColor}
                      stroke={isSelected ? '#fff' : '#333'}
                      strokeWidth={isSelected ? 3 : 1}
                      onClick={() => handleSeatClick(seat)}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage().container();
                        container.style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage().container();
                        container.style.cursor = isEditorMode ? 'crosshair' : 'default';
                      }}
                      shadowColor="black"
                      shadowBlur={3}
                      shadowOpacity={0.3}
                    />
                    <Text
                      x={seat.x - 15}
                      y={seat.y + seat.size + 5}
                      text={`${seat.row}${seat.number}`}
                      fontSize={10}
                      fontFamily="Arial"
                      fill="#333"
                      width={30}
                      align="center"
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Leyenda */}
      <div className="seatmap-legend">
        <h4>Leyenda de Precios</h4>
        <div className="legend-items">
          {Object.entries(SEAT_TYPES).map(([key, type]) => (
            <div key={key} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: type.color }}
              ></div>
              <span>{type.name}: ${type.price}</span>
            </div>
          ))}
          {showDetected && detectedSeats.length > 0 && (
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'rgba(0, 255, 136, 0.6)' }}></div>
              <span>Detectado automáticamente</span>
            </div>
          )}
          {!isEditorMode && (
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#FF0080' }}></div>
              <span>Seleccionado</span>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de selección (solo en modo vista) */}
      {!isEditorMode && selectedSeats.length > 0 && (
        <div className="selection-summary">
          <h4>Asientos Seleccionados ({selectedSeats.length})</h4>
          <div className="selected-seats-list">
            {selectedSeats.map(seat => (
              <span key={seat.id} className="selected-seat-tag">
                {seat.row}{seat.number} - ${seat.price}
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

export default SeatMapEditor; 