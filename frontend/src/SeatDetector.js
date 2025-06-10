// SeatDetector.js - Detector automático de asientos usando Computer Vision

class SeatDetector {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.imageData = null;
    this.threshold = 128; // Threshold para binarización
  }

  // Analizar imagen para detectar asientos automáticamente
  async analyzeImage(imageElement, options = {}) {
    const {
      minRadius = 8,
      maxRadius = 25,
      minDistance = 20,
      sensitivity = 0.7,
      rowTolerance = 15,
      columnTolerance = 15
    } = options;

    // Crear canvas temporal para análisis
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Escalar imagen para análisis más rápido pero efectivo
    const scale = Math.min(1000 / imageElement.width, 800 / imageElement.height);
    this.canvas.width = imageElement.width * scale;
    this.canvas.height = imageElement.height * scale;

    // Dibujar imagen escalada
    this.ctx.drawImage(imageElement, 0, 0, this.canvas.width, this.canvas.height);
    this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    console.log('🔍 Analizando imagen para detectar asientos...');

    // 1. Preprocesamiento mejorado
    const processedData = this.preprocessImage(this.imageData);
    
    // 2. Detectar formas circulares y rectangulares
    const circles = this.detectCircles(processedData, minRadius, maxRadius, minDistance);
    const rectangles = this.detectRectangles(processedData, minRadius * 2, maxRadius * 2);
    
    // 3. Combinar detecciones
    const allShapes = [...circles, ...rectangles];
    
    // 4. Filtrar y limpiar detecciones
    const filteredShapes = this.filterShapes(allShapes, minDistance);
    
    // 5. Agrupar en filas y columnas
    const organizedSeats = this.organizeIntoRowsAndColumns(
      filteredShapes, 
      rowTolerance, 
      columnTolerance, 
      scale
    );

    console.log(`✅ Detectados ${organizedSeats.length} asientos organizados`);
    
    return organizedSeats;
  }

  // Preprocesamiento de imagen (filtros, binarización)
  preprocessImage(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Convertir a escala de grises
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;     // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
      // Alpha se mantiene
    }

    // Aplicar filtro gaussiano (blur)
    const blurred = this.gaussianBlur(data, width, height);
    
    // Binarización con threshold adaptativo
    const binary = this.adaptiveThreshold(blurred, width, height);

    return { data: binary, width, height };
  }

  // Filtro gaussiano para suavizar la imagen
  gaussianBlur(data, width, height) {
    const result = new Uint8ClampedArray(data.length);
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1]; // 3x3 Gaussian kernel
    const kernelSum = 16;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4;
        const value = Math.round(sum / kernelSum);
        result[idx] = value;
        result[idx + 1] = value;
        result[idx + 2] = value;
        result[idx + 3] = data[idx + 3];
      }
    }

    return result;
  }

  // Threshold adaptativo para binarización mejorado
  adaptiveThreshold(data, width, height) {
    const result = new Uint8ClampedArray(data.length);
    const windowSize = 20; // Aumentado para mejor detección
    const C = 8; // Ajustado para mejor contraste

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calcular media local
        let sum = 0, count = 0;
        for (let wy = Math.max(0, y - windowSize); wy < Math.min(height, y + windowSize); wy++) {
          for (let wx = Math.max(0, x - windowSize); wx < Math.min(width, x + windowSize); wx++) {
            sum += data[(wy * width + wx) * 4];
            count++;
          }
        }
        const mean = sum / count;
        const threshold = mean - C;

        const idx = (y * width + x) * 4;
        const value = data[idx] > threshold ? 255 : 0;
        result[idx] = value;
        result[idx + 1] = value;
        result[idx + 2] = value;
        result[idx + 3] = data[idx + 3];
      }
    }

    return result;
  }

  // Detectar círculos usando transformada de Hough simplificada
  detectCircles(processedData, minRadius, maxRadius, minDistance) {
    const { data, width, height } = processedData;
    const circles = [];

    // Detectar bordes usando Sobel
    const edges = this.sobelEdgeDetection(data, width, height);

    // Transformada de Hough para círculos con parámetros mejorados
    for (let r = minRadius; r <= maxRadius; r++) {
      const accumulator = new Array(width * height).fill(0);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (edges[y * width + x] > 100) { // Umbral ajustado
            // Votar por posibles centros con menos densidad angular para velocidad
            for (let theta = 0; theta < 360; theta += 8) { // Incremento mayor
              const rad = (theta * Math.PI) / 180;
              const centerX = Math.round(x - r * Math.cos(rad));
              const centerY = Math.round(y - r * Math.sin(rad));

              if (centerX >= 0 && centerX < width && centerY >= 0 && centerY < height) {
                accumulator[centerY * width + centerX]++;
              }
            }
          }
        }
      }

      // Encontrar máximos locales en el acumulador
      const threshold = Math.max(12, r * 0.6); // Threshold dinámico
      for (let y = r; y < height - r; y++) {
        for (let x = r; x < width - r; x++) {
          if (accumulator[y * width + x] > threshold) {
            // Verificar que es máximo local
            let isMaximum = true;
            for (let dy = -3; dy <= 3 && isMaximum; dy++) {
              for (let dx = -3; dx <= 3 && isMaximum; dx++) {
                if (accumulator[(y + dy) * width + (x + dx)] > accumulator[y * width + x]) {
                  isMaximum = false;
                }
              }
            }

            if (isMaximum) {
              circles.push({
                x: x,
                y: y,
                radius: r,
                score: accumulator[y * width + x],
                type: 'circle'
              });
            }
          }
        }
      }
    }

    // Filtrar círculos superpuestos
    return this.filterOverlapping(circles, minDistance);
  }

  // Detectar rectángulos/cuadrados mejorado
  detectRectangles(processedData, minSize, maxSize) {
    const { data, width, height } = processedData;
    const rectangles = [];

    // Buscar regiones rectangulares usando connected components
    const visited = new Array(width * height).fill(false);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!visited[idx] && data[idx * 4] === 0) { // Píxel negro
          const component = this.floodFill(data, width, height, x, y, visited);
          
          if (component.length > minSize && component.length < maxSize * maxSize) {
            const bounds = this.getBoundingRect(component);
            const aspectRatio = bounds.width / bounds.height;
            
            // Criterios más flexibles para rectángulos
            if (aspectRatio > 0.5 && aspectRatio < 2.0 && bounds.width > 6 && bounds.height > 6) {
              rectangles.push({
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height / 2,
                width: bounds.width,
                height: bounds.height,
                score: component.length,
                type: 'rectangle'
              });
            }
          }
        }
      }
    }

    return rectangles;
  }

  // Detección de bordes Sobel
  sobelEdgeDetection(data, width, height) {
    const edges = new Array(width * height);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = data[((y + ky) * width + (x + kx)) * 4];
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            gx += pixel * sobelX[kernelIdx];
            gy += pixel * sobelY[kernelIdx];
          }
        }

        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return edges;
  }

  // Flood fill para encontrar componentes conectados
  floodFill(data, width, height, startX, startY, visited) {
    const stack = [{ x: startX, y: startY }];
    const component = [];
    
    while (stack.length > 0) {
      const { x, y } = stack.pop();
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const idx = y * width + x;
      if (visited[idx] || data[idx * 4] !== 0) continue;
      
      visited[idx] = true;
      component.push({ x, y });
      
      // Añadir vecinos (4-conectividad para mejor precisión)
      stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
    }
    
    return component;
  }

  // Obtener bounding rectangle de un componente
  getBoundingRect(component) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    component.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  // Filtrar formas superpuestas
  filterOverlapping(shapes, minDistance) {
    const filtered = [];
    
    shapes.sort((a, b) => b.score - a.score); // Ordenar por score descendente
    
    for (const shape of shapes) {
      let isValid = true;
      
      for (const existing of filtered) {
        const distance = Math.sqrt(
          Math.pow(shape.x - existing.x, 2) + Math.pow(shape.y - existing.y, 2)
        );
        
        if (distance < minDistance) {
          isValid = false;
          break;
        }
      }
      
      if (isValid) {
        filtered.push(shape);
      }
    }
    
    return filtered;
  }

  // Organizar formas detectadas en filas y columnas (mejorado)
  organizeIntoRowsAndColumns(shapes, rowTolerance, columnTolerance, scale) {
    if (shapes.length === 0) return [];

    // Agrupar por filas (Y similar) con mejor tolerancia
    const rows = [];
    const sortedByY = [...shapes].sort((a, b) => a.y - b.y);

    let currentRow = [sortedByY[0]];
    for (let i = 1; i < sortedByY.length; i++) {
      const shape = sortedByY[i];
      const rowAvgY = currentRow.reduce((sum, s) => sum + s.y, 0) / currentRow.length;
      
      if (Math.abs(shape.y - rowAvgY) <= rowTolerance) {
        currentRow.push(shape);
      } else {
        rows.push(currentRow);
        currentRow = [shape];
      }
    }
    rows.push(currentRow);

    // Organizar cada fila por columnas (X) con mejor espaciado
    const organizedSeats = [];
    
    rows.forEach((row, rowIndex) => {
      const sortedRow = row.sort((a, b) => a.x - b.x);
      
      // Detectar grupos separados por pasillos
      const groups = [];
      let currentGroup = [sortedRow[0]];
      
      for (let i = 1; i < sortedRow.length; i++) {
        const distance = sortedRow[i].x - sortedRow[i - 1].x;
        
        if (distance <= columnTolerance * 2) {
          currentGroup.push(sortedRow[i]);
        } else {
          groups.push(currentGroup);
          currentGroup = [sortedRow[i]];
        }
      }
      groups.push(currentGroup);
      
      // Asignar números de asiento por grupo
      let seatCounter = 1;
      groups.forEach(group => {
        group.forEach(shape => {
          // Escalar de vuelta a coordenadas originales
          const seat = {
            id: `detected-${rowIndex}-${seatCounter}`,
            x: shape.x / scale,
            y: shape.y / scale,
            row: String.fromCharCode(65 + rowIndex), // A, B, C...
            seat: seatCounter,
            label: `${String.fromCharCode(65 + rowIndex)}${seatCounter}`,
            sectionName: 'General', // Por defecto
            section: 'general',
            price: 50,
            detectedType: shape.type,
            confidence: Math.min(100, Math.round(shape.score / 2)),
            isDetected: true
          };
          
          organizedSeats.push(seat);
          seatCounter++;
        });
      });
    });

    return organizedSeats;
  }

  // Filtrar formas por criterios adicionales
  filterShapes(shapes, minDistance) {
    // Eliminar formas muy cerca del borde
    const margin = 10;
    const filtered = shapes.filter(shape => {
      return shape.x > margin && 
             shape.y > margin && 
             shape.x < this.canvas.width - margin && 
             shape.y < this.canvas.height - margin;
    });

    // Aplicar non-maximum suppression
    return this.filterOverlapping(filtered, minDistance);
  }

  // Método público para detectar patrones específicos (mejorado)
  detectSeatPatterns(imageElement, patternType = 'auto') {
    const patterns = {
      theater: { 
        minRadius: 6, 
        maxRadius: 18, 
        minDistance: 15, 
        rowTolerance: 18,
        columnTolerance: 15
      },
      stadium: { 
        minRadius: 4, 
        maxRadius: 12, 
        minDistance: 10, 
        rowTolerance: 12,
        columnTolerance: 10
      },
      conference: { 
        minRadius: 8, 
        maxRadius: 22, 
        minDistance: 20, 
        rowTolerance: 15,
        columnTolerance: 18
      },
      auto: { 
        minRadius: 6, 
        maxRadius: 20, 
        minDistance: 12, 
        rowTolerance: 15,
        columnTolerance: 12
      }
    };

    return this.analyzeImage(imageElement, patterns[patternType] || patterns.auto);
  }
}

export default SeatDetector; 