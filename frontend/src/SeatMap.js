import React, { useRef, useState } from 'react';
import { SeatsioSeatingChart } from '@seatsio/seatsio-react';

const SeatMap = ({ publicKey, eventKey, onSelectionChange }) => {
  const chartRef = useRef(null);
  const [selection, setSelection] = useState([]);

  const handleObjectSelected = async () => {
    if (chartRef.current) {
      try {
        const selectedObjects = await chartRef.current.listSelectedObjects();
        console.log('Asientos seleccionados:', selectedObjects);
        setSelection(selectedObjects);
        if (onSelectionChange) {
          // Convertir a format compatible con el componente padre
          const selectedLabels = selectedObjects.map(obj => obj.label);
          onSelectionChange(selectedLabels);
        }
      } catch (error) {
        console.error('Error obteniendo objetos seleccionados:', error);
      }
    }
  };

  const handleObjectDeselected = async () => {
    if (chartRef.current) {
      try {
        const selectedObjects = await chartRef.current.listSelectedObjects();
        console.log('Asientos después de deselección:', selectedObjects);
        setSelection(selectedObjects);
        if (onSelectionChange) {
          // Convertir a format compatible con el componente padre
          const selectedLabels = selectedObjects.map(obj => obj.label);
          onSelectionChange(selectedLabels);
        }
      } catch (error) {
        console.error('Error obteniendo objetos seleccionados:', error);
      }
    }
  };

  const handleChartRendered = (chart) => {
    console.log('Chart renderizado con SDK oficial:', chart);
    chartRef.current = chart;
  };

  const handleRenderStarted = () => {
    console.log('Renderizado iniciado con SDK oficial');
  };

  return (
    <div className="seatmap-wrapper">
      <div className="seatmap-info">
        <p><strong>Evento:</strong> {eventKey}</p>
        <p><strong>Workspace Key:</strong> {publicKey?.substring(0, 8)}...</p>
        <p><strong>Región:</strong> Sud América (SA)</p>
        <p><strong>SDK:</strong> @seatsio/seatsio-react (Oficial)</p>
        {selection.length > 0 && (
          <p><strong>Seleccionados:</strong> {selection.length} asiento(s)</p>
        )}
      </div>

      <div style={{ height: '600px', width: '100%' }}>
        <SeatsioSeatingChart
          workspaceKey={publicKey}
          event={eventKey}
          region="sa"
          session="continue"
          priceFormatter={(price) => price ? `$${price}` : 'Gratis'}
          language="es"
          showZoomOutButtonOnMobile={true}
          showFullScreenButton={true}
          loading="Cargando mapa de asientos..."
          onChartRendered={handleChartRendered}
          onRenderStarted={handleRenderStarted}
          onObjectSelected={handleObjectSelected}
          onObjectDeselected={handleObjectDeselected}
          onObjectClicked={(object) => {
            console.log('Click en objeto:', object);
          }}
        />
      </div>

      <div className="seatmap-legend">
        <div className="legend-item">
          <span className="legend-color available"></span>
          <span>Disponible</span>
        </div>
        <div className="legend-item">
          <span className="legend-color selected"></span>
          <span>Seleccionado</span>
        </div>
        <div className="legend-item">
          <span className="legend-color unavailable"></span>
          <span>No disponible</span>
        </div>
      </div>

      {selection.length > 0 && (
        <div className="selection-summary">
          <h4>Asientos Seleccionados:</h4>
          <div className="selected-seats-list">
            {selection.map((seat, index) => (
              <span key={index} className="selected-seat-tag">
                {seat.labels?.displayedLabel || seat.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatMap;
