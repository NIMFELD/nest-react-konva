// SeatDetector.js - Detector automático de asientos usando Computer Vision

class SeatDetector {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.imageData = null;
    this.threshold = 128; // Threshold para binarización
  }

  // Detectar asientos automáticamente en una imagen
  async detectSeats(imageElement, options = {}) {
    const {
      minRadius = 8,
      maxRadius = 25,
      threshold = 0.3,
      pattern = 'auto' // 'auto', 'theater', 'stadium', 'conference'
    } = options;

    return new Promise((resolve) => {
      // Configurar canvas
      this.canvas.width = imageElement.width;
      this.canvas.height = imageElement.height;
      this.ctx.drawImage(imageElement, 0, 0);

      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      let detectedSeats = [];

      switch (pattern) {
        case 'theater':
          detectedSeats = this.detectTheaterSeats(imageData, { minRadius, maxRadius, threshold });
          break;
        case 'stadium':
          detectedSeats = this.detectStadiumSeats(imageData, { minRadius, maxRadius, threshold });
          break;
        case 'conference':
          detectedSeats = this.detectConferenceSeats(imageData, { minRadius, maxRadius, threshold });
          break;
        default:
          detectedSeats = this.detectGenericSeats(imageData, { minRadius, maxRadius, threshold });
      }

      // Organizar asientos en filas y columnas
      const organizedSeats = this.organizeSeatsInRows(detectedSeats);
      
      resolve(organizedSeats);
    });
  }

  // Detectar asientos genéricos usando Hough Transform
  detectGenericSeats(imageData, options) {
    const { width, height, data } = imageData;
    const { minRadius, maxRadius, threshold } = options;
    
    // Convertir a escala de grises
    const grayData = this.convertToGrayscale(data, width, height);
    
    // Aplicar detección de bordes (Sobel)
    const edges = this.detectEdges(grayData, width, height);
    
    // Hough Transform para círculos
    const circles = this.houghCircles(edges, width, height, minRadius, maxRadius, threshold);
    
    // Filtrar y optimizar círculos detectados
    return this.filterAndOptimizeCircles(circles, width, height);
  }

  // Detectar asientos de teatro (filas curvas)
  detectTheaterSeats(imageData, options) {
    const genericSeats = this.detectGenericSeats(imageData, options);
    
    // Agrupar por filas curvas
    const curvedRows = this.groupIntoCurvedRows(genericSeats);
    
    // Asignar tipos basados en posición (VIP adelante, General atrás)
    return curvedRows.map((seat, index) => ({
      ...seat,
      type: this.determineTheaterSeatType(seat, curvedRows.length, index),
      pattern: 'theater'
    }));
  }

  // Detectar asientos de estadio (secciones grandes)
  detectStadiumSeats(imageData, options) {
    const genericSeats = this.detectGenericSeats(imageData, options);
    
    // Detectar secciones grandes
    const sections = this.detectLargeSections(genericSeats);
    
    return sections.map((seat, index) => ({
      ...seat,
      type: this.determineStadiumSeatType(seat, sections),
      pattern: 'stadium'
    }));
  }

  // Detectar asientos de conferencia (filas rectas)
  detectConferenceSeats(imageData, options) {
    const genericSeats = this.detectGenericSeats(imageData, options);
    
    // Agrupar en filas rectas
    const straightRows = this.groupIntoStraightRows(genericSeats);
    
    return straightRows.map(seat => ({
      ...seat,
      type: 'general', // La mayoría son generales en conferencias
      pattern: 'conference'
    }));
  }

  // Convertir imagen a escala de grises
  convertToGrayscale(data, width, height) {
    const gray = new Uint8Array(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Fórmula de luminancia
      const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      gray[i / 4] = luminance;
    }
    
    return gray;
  }

  // Detectar bordes usando filtro Sobel
  detectEdges(grayData, width, height) {
    const edges = new Uint8Array(width * height);
    
    // Kernels Sobel
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gX = 0, gY = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = grayData[(y + ky) * width + (x + kx)];
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            
            gX += pixel * sobelX[kernelIndex];
            gY += pixel * sobelY[kernelIndex];
          }
        }
        
        const magnitude = Math.sqrt(gX * gX + gY * gY);
        edges[y * width + x] = magnitude > 50 ? 255 : 0;
      }
    }
    
    return edges;
  }

  // Hough Transform para detectar círculos
  houghCircles(edges, width, height, minRadius, maxRadius, threshold) {
    const circles = [];
    const accumulator = {};
    
    // Crear acumulador 3D (x, y, radius)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edges[y * width + x] > 0) {
          
          // Para cada punto de borde, votar por posibles círculos
          for (let r = minRadius; r <= maxRadius; r++) {
            for (let angle = 0; angle < 360; angle += 5) {
              const radian = (angle * Math.PI) / 180;
              const centerX = Math.round(x - r * Math.cos(radian));
              const centerY = Math.round(y - r * Math.sin(radian));
              
              if (centerX >= 0 && centerX < width && centerY >= 0 && centerY < height) {
                const key = `${centerX},${centerY},${r}`;
                accumulator[key] = (accumulator[key] || 0) + 1;
              }
            }
          }
        }
      }
    }
    
    // Encontrar picos en el acumulador
    const minVotes = Math.round(2 * Math.PI * minRadius * threshold);
    
    Object.entries(accumulator).forEach(([key, votes]) => {
      if (votes >= minVotes) {
        const [x, y, r] = key.split(',').map(Number);
        circles.push({ x, y, radius: r, votes, confidence: votes / (2 * Math.PI * r) });
      }
    });
    
    return circles.sort((a, b) => b.confidence - a.confidence);
  }

  // Filtrar círculos superpuestos
  filterAndOptimizeCircles(circles, width, height) {
    const filtered = [];
    
    circles.forEach(circle => {
      let isUnique = true;
      
      for (const existing of filtered) {
        const distance = Math.sqrt(
          Math.pow(circle.x - existing.x, 2) + Math.pow(circle.y - existing.y, 2)
        );
        
        // Si está muy cerca de otro círculo, mantener el de mayor confianza
        if (distance < (circle.radius + existing.radius) * 0.7) {
          if (circle.confidence <= existing.confidence) {
            isUnique = false;
            break;
          } else {
            // Remover el círculo existente menos confiable
            const index = filtered.indexOf(existing);
            filtered.splice(index, 1);
          }
        }
      }
      
      if (isUnique) {
        filtered.push(circle);
      }
    });
    
    return filtered;
  }

  // Organizar asientos en filas
  organizeSeatsInRows(seats) {
    if (seats.length === 0) return [];
    
    // Agrupar por coordenada Y (filas)
    const rows = {};
    const tolerance = 20; // píxeles de tolerancia para agrupar en filas
    
    seats.forEach(seat => {
      let assignedToRow = false;
      
      Object.keys(rows).forEach(rowY => {
        if (Math.abs(seat.y - parseInt(rowY)) <= tolerance) {
          rows[rowY].push(seat);
          assignedToRow = true;
        }
      });
      
      if (!assignedToRow) {
        rows[seat.y] = [seat];
      }
    });
    
    // Ordenar filas y asientos dentro de cada fila
    const organizedSeats = [];
    const sortedRowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b);
    
    sortedRowKeys.forEach((rowY, rowIndex) => {
      const rowSeats = rows[rowY].sort((a, b) => a.x - b.x);
      
      rowSeats.forEach((seat, seatIndex) => {
        organizedSeats.push({
          ...seat,
          id: `detected-${rowIndex}-${seatIndex}`,
          row: String.fromCharCode(65 + rowIndex), // A, B, C...
          number: seatIndex + 1,
          type: seat.type || 'general'
        });
      });
    });
    
    return organizedSeats;
  }

  // Agrupar asientos en filas curvas (teatro)
  groupIntoCurvedRows(seats) {
    // Implementar lógica para detectar curvatura
    return this.organizeSeatsInRows(seats);
  }

  // Agrupar asientos en filas rectas (conferencia)
  groupIntoStraightRows(seats) {
    return this.organizeSeatsInRows(seats);
  }

  // Detectar secciones grandes (estadio)
  detectLargeSections(seats) {
    // Usar clustering para detectar grandes grupos de asientos
    return seats;
  }

  // Determinar tipo de asiento en teatro
  determineTheaterSeatType(seat, totalRows, index) {
    const position = index / totalRows;
    
    if (position < 0.2) return 'vip';
    if (position < 0.6) return 'premium';
    return 'general';
  }

  // Determinar tipo de asiento en estadio
  determineStadiumSeatType(seat, allSeats) {
    // Basado en proximidad al centro del campo
    const centerX = allSeats.reduce((sum, s) => sum + s.x, 0) / allSeats.length;
    const centerY = allSeats.reduce((sum, s) => sum + s.y, 0) / allSeats.length;
    
    const distance = Math.sqrt(Math.pow(seat.x - centerX, 2) + Math.pow(seat.y - centerY, 2));
    
    if (distance < 100) return 'vip';
    if (distance < 200) return 'premium';
    return 'general';
  }
}

export default SeatDetector; 