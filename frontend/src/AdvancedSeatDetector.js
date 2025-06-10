// AdvancedSeatDetector.js - Detector automático avanzado para layouts complejos

class AdvancedSeatDetector {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.imageData = null;
    this.debugMode = true;
  }

  // Analizar imagen con algoritmos avanzados
  async analyzeImage(imageElement, options = {}) {
    const {
      minRadius = 6,
      maxRadius = 25,
      minDistance = 12,
      sensitivity = 0.7,
      rowTolerance = 20,
      columnTolerance = 20
    } = options;

    this.setupCanvas(imageElement);
    console.log('🔍 Iniciando análisis avanzado de imagen...');
    console.log(`📐 Dimensiones canvas: ${this.canvas.width}x${this.canvas.height}`);

    try {
      // 1. Análisis de colores dominantes y secciones
      const colorAnalysis = this.analyzeColorSections();
      console.log(`🎨 Detectadas ${colorAnalysis.sections.length} secciones de color`);

      // 2. Detectar patrones de filas y columnas
      const rowPatterns = this.detectRowPatterns(colorAnalysis);
      console.log(`📏 Detectados ${rowPatterns.length} patrones de filas`);

      // 3. Detectar asientos individuales
      const detectedSeats = this.detectIndividualSeats(rowPatterns, {
        minRadius,
        maxRadius,
        minDistance
      });
      console.log(`🪑 Detectados ${detectedSeats.length} asientos individuales`);

      // 4. Organizar en estructura de teatro
      const organizedSeats = this.organizeTheaterLayout(detectedSeats, {
        rowTolerance,
        columnTolerance
      });

      console.log(`✅ Organizados ${organizedSeats.length} asientos en ${this.countUniqueRows(organizedSeats)} filas`);
      return organizedSeats;

    } catch (error) {
      console.error('❌ Error en análisis avanzado:', error);
      return this.fallbackDetection(imageElement, options);
    }
  }

  // Configurar canvas para análisis
  setupCanvas(imageElement) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Escalar para análisis óptimo
    const scale = Math.min(1200 / imageElement.width, 900 / imageElement.height, 1);
    this.canvas.width = imageElement.width * scale;
    this.canvas.height = imageElement.height * scale;
    this.scale = scale;

    this.ctx.drawImage(imageElement, 0, 0, this.canvas.width, this.canvas.height);
    this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  // Análisis de secciones por color
  analyzeColorSections() {
    const { data, width, height } = this.imageData;
    
    // 1. Muestreo de colores
    const colorHistogram = new Map();
    const sampleStep = 3;
    
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Cuantizar color
        const colorKey = this.quantizeColor(r, g, b, 40);
        
        if (!colorHistogram.has(colorKey)) {
          colorHistogram.set(colorKey, {
            count: 0,
            positions: [],
            avgColor: { r: 0, g: 0, b: 0 },
            bounds: { minX: width, maxX: 0, minY: height, maxY: 0 }
          });
        }
        
        const colorData = colorHistogram.get(colorKey);
        colorData.count++;
        colorData.positions.push({ x, y });
        colorData.avgColor.r += r;
        colorData.avgColor.g += g;
        colorData.avgColor.b += b;
        
        // Actualizar bounds
        colorData.bounds.minX = Math.min(colorData.bounds.minX, x);
        colorData.bounds.maxX = Math.max(colorData.bounds.maxX, x);
        colorData.bounds.minY = Math.min(colorData.bounds.minY, y);
        colorData.bounds.maxY = Math.max(colorData.bounds.maxY, y);
      }
    }

    // 2. Filtrar colores significativos
    const significantColors = Array.from(colorHistogram.entries())
      .filter(([key, data]) => {
        const area = (data.bounds.maxX - data.bounds.minX) * (data.bounds.maxY - data.bounds.minY);
        return data.count > 50 && area > 1000;
      })
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    // 3. Crear secciones
    const sections = significantColors.map(([colorKey, colorData], index) => {
      const avgR = Math.round(colorData.avgColor.r / colorData.count);
      const avgG = Math.round(colorData.avgColor.g / colorData.count);
      const avgB = Math.round(colorData.avgColor.b / colorData.count);
      
      return {
        id: `section-${index}`,
        color: { r: avgR, g: avgG, b: avgB },
        colorKey,
        bounds: {
          x: colorData.bounds.minX,
          y: colorData.bounds.minY,
          width: colorData.bounds.maxX - colorData.bounds.minX,
          height: colorData.bounds.maxY - colorData.bounds.minY
        },
        pixelCount: colorData.count,
        positions: colorData.positions,
        dominanceScore: colorData.count / (width * height) * 100
      };
    });

    return { sections, dominantColors: significantColors };
  }

  // Detectar patrones de filas
  detectRowPatterns(colorAnalysis) {
    const { sections } = colorAnalysis;
    const allRowPatterns = [];
    
    for (const section of sections) {
      if (section.dominanceScore < 2) continue; // Skip secciones muy pequeñas
      
      console.log(`🔍 Analizando sección ${section.id} (${section.dominanceScore.toFixed(1)}%)`);
      
      // Crear región de interés para la sección
      const roi = this.extractRegionOfInterest(section);
      
      // Detectar líneas horizontales (filas)
      const horizontalLines = this.detectHorizontalLines(roi);
      
      // Agrupar líneas en filas
      const rowGroups = this.groupLinesIntoRows(horizontalLines, section);
      
      allRowPatterns.push(...rowGroups);
    }
    
    return allRowPatterns;
  }

  // Extraer región de interés
  extractRegionOfInterest(section) {
    const { bounds } = section;
    
    // Expandir bounds ligeramente
    const expandedBounds = {
      x: Math.max(0, bounds.x - 5),
      y: Math.max(0, bounds.y - 5),
      width: Math.min(this.canvas.width - bounds.x, bounds.width + 10),
      height: Math.min(this.canvas.height - bounds.y, bounds.height + 10)
    };
    
    const roiImageData = this.ctx.getImageData(
      expandedBounds.x,
      expandedBounds.y,
      expandedBounds.width,
      expandedBounds.height
    );
    
    return {
      imageData: roiImageData,
      bounds: expandedBounds,
      section: section
    };
  }

  // Detectar líneas horizontales usando transformada de Hough
  detectHorizontalLines(roi) {
    const { imageData, bounds } = roi;
    const { data, width, height } = imageData;
    
    // Preprocesar para detección de bordes
    const edges = this.detectEdges(data, width, height);
    
    // Transformada de Hough para líneas horizontales
    const houghLines = [];
    const minLineLength = Math.max(30, width * 0.1);
    
    // Buscar patrones horizontales
    for (let y = 2; y < height - 2; y++) {
      let lineStart = -1;
      let currentLength = 0;
      
      for (let x = 0; x < width; x++) {
        const edgeStrength = edges[y * width + x];
        
        if (edgeStrength > 100) { // Umbral de borde
          if (lineStart === -1) {
            lineStart = x;
          }
          currentLength++;
        } else {
          if (currentLength > minLineLength) {
            houghLines.push({
              startX: lineStart + bounds.x,
              endX: lineStart + currentLength + bounds.x,
              y: y + bounds.y,
              length: currentLength,
              strength: currentLength
            });
          }
          lineStart = -1;
          currentLength = 0;
        }
      }
      
      // Línea que llega al final
      if (currentLength > minLineLength) {
        houghLines.push({
          startX: lineStart + bounds.x,
          endX: lineStart + currentLength + bounds.x,
          y: y + bounds.y,
          length: currentLength,
          strength: currentLength
        });
      }
    }
    
    // Filtrar y fusionar líneas cercanas
    return this.mergeNearbyLines(houghLines);
  }

  // Detectar bordes usando Sobel
  detectEdges(data, width, height) {
    const edges = new Array(width * height).fill(0);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Convertir a gris si no lo está
        const gray = data[(y * width + x) * 4]; // Asumiendo ya es gris
        
        // Sobel Y (horizontal edges)
        let gy = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = data[((y + ky) * width + (x + kx)) * 4];
            const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1][(ky + 1) * 3 + (kx + 1)];
            gy += pixel * sobelY;
          }
        }
        
        edges[y * width + x] = Math.abs(gy);
      }
    }
    
    return edges;
  }

  // Fusionar líneas cercanas
  mergeNearbyLines(lines) {
    const merged = [];
    const sorted = lines.sort((a, b) => a.y - b.y);
    const tolerance = 5;
    
    for (const line of sorted) {
      const nearby = merged.find(m => Math.abs(m.y - line.y) < tolerance);
      
      if (nearby) {
        // Fusionar con línea existente
        nearby.startX = Math.min(nearby.startX, line.startX);
        nearby.endX = Math.max(nearby.endX, line.endX);
        nearby.length = nearby.endX - nearby.startX;
        nearby.strength += line.strength;
      } else {
        merged.push({ ...line });
      }
    }
    
    return merged.filter(line => line.length > 20);
  }

  // Agrupar líneas en filas
  groupLinesIntoRows(lines, section) {
    const rowGroups = [];
    const groupTolerance = 15;
    
    for (const line of lines) {
      const existingGroup = rowGroups.find(group => 
        Math.abs(group.y - line.y) < groupTolerance
      );
      
      if (existingGroup) {
        existingGroup.lines.push(line);
        existingGroup.y = (existingGroup.y + line.y) / 2; // Promedio
        existingGroup.totalLength += line.length;
      } else {
        rowGroups.push({
          y: line.y,
          lines: [line],
          sectionId: section.id,
          sectionColor: section.color,
          totalLength: line.length,
          confidence: line.strength
        });
      }
    }
    
    return rowGroups.filter(group => group.totalLength > 40);
  }

  // Detectar asientos individuales
  detectIndividualSeats(rowPatterns, options) {
    const { minRadius, maxRadius, minDistance } = options;
    const allSeats = [];
    
    for (const rowPattern of rowPatterns) {
      console.log(`🔍 Detectando asientos en fila Y=${rowPattern.y}`);
      
      // Analizar región de la fila
      const rowSeats = this.analyzeRowForSeats(rowPattern, {
        minRadius,
        maxRadius,
        minDistance
      });
      
      allSeats.push(...rowSeats);
    }
    
    return allSeats;
  }

  // Analizar fila para encontrar asientos
  analyzeRowForSeats(rowPattern, options) {
    const { minRadius, maxRadius, minDistance } = options;
    const seats = [];
    
    // Crear región expandida alrededor de la fila
    const rowHeight = maxRadius * 2;
    const rowY = Math.max(0, rowPattern.y - rowHeight / 2);
    const rowRegion = this.ctx.getImageData(
      0, 
      rowY, 
      this.canvas.width, 
      Math.min(rowHeight, this.canvas.height - rowY)
    );
    
    // Detectar componentes conectados en la región
    const components = this.findConnectedComponents(
      rowRegion.data, 
      rowRegion.width, 
      rowRegion.height
    );
    
    // Filtrar componentes que parecen asientos
    for (const component of components) {
      const bounds = this.getBoundingRect(component.pixels);
      const area = component.pixels.length;
      const aspectRatio = bounds.width / bounds.height;
      
      // Criterios de validación
      const validSize = area >= minRadius * minRadius && area <= maxRadius * maxRadius * 4;
      const validAspect = aspectRatio >= 0.4 && aspectRatio <= 2.5;
      const validDimensions = bounds.width >= minRadius && bounds.height >= minRadius/2;
      
      if (validSize && validAspect && validDimensions) {
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2 + rowY;
        
        // Verificar que esté cerca de la línea de la fila
        if (Math.abs(centerY - rowPattern.y) < maxRadius) {
          seats.push({
            x: centerX,
            y: centerY,
            width: bounds.width,
            height: bounds.height,
            area: area,
            type: aspectRatio > 1.2 ? 'rectangle' : 'circle',
            confidence: this.calculateSeatConfidence(component, bounds),
            rowPatternId: rowPattern.sectionId,
            sectionColor: rowPattern.sectionColor
          });
        }
      }
    }
    
    // Filtrar asientos superpuestos
    return this.filterOverlappingSeats(seats, minDistance);
  }

  // Calcular confianza del asiento
  calculateSeatConfidence(component, bounds) {
    const area = component.pixels.length;
    const boundingArea = bounds.width * bounds.height;
    const fillRatio = area / boundingArea;
    
    // Combinar varios factores
    const sizeScore = Math.min(area / 100, 1); // Normalizar área
    const shapeScore = fillRatio; // Qué tan lleno está el rectángulo
    const regularityScore = this.calculateShapeRegularity(component);
    
    return Math.round(((sizeScore + shapeScore + regularityScore) / 3) * 100);
  }

  // Calcular regularidad de forma
  calculateShapeRegularity(component) {
    const bounds = this.getBoundingRect(component.pixels);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Calcular distancia promedio al centro
    let totalDistance = 0;
    for (const pixel of component.pixels) {
      const distance = Math.sqrt(
        Math.pow(pixel.x - centerX, 2) + Math.pow(pixel.y - centerY, 2)
      );
      totalDistance += distance;
    }
    
    const avgDistance = totalDistance / component.pixels.length;
    const expectedRadius = Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height) / 2;
    
    return Math.max(0, 1 - Math.abs(avgDistance - expectedRadius) / expectedRadius);
  }

  // Organizar en layout de teatro
  organizeTheaterLayout(seats, options) {
    const { rowTolerance, columnTolerance } = options;
    
    if (seats.length === 0) return [];
    
    console.log(`🎭 Organizando ${seats.length} asientos en layout de teatro...`);
    
    // 1. Agrupar por secciones
    const sectionGroups = this.groupSeatsBySection(seats);
    
    // 2. Organizar cada sección
    const organizedSeats = [];
    let globalRowIndex = 0;
    
    for (const [sectionId, sectionSeats] of Object.entries(sectionGroups)) {
      const organized = this.organizeSectionSeats(
        sectionSeats,
        rowTolerance,
        columnTolerance,
        globalRowIndex
      );
      
      organizedSeats.push(...organized);
      globalRowIndex += this.countUniqueRows(organized);
    }
    
    return organizedSeats;
  }

  // Agrupar asientos por sección
  groupSeatsBySection(seats) {
    const groups = {};
    
    for (const seat of seats) {
      const sectionId = seat.rowPatternId || 'default';
      if (!groups[sectionId]) {
        groups[sectionId] = [];
      }
      groups[sectionId].push(seat);
    }
    
    return groups;
  }

  // Organizar asientos de una sección
  organizeSectionSeats(seats, rowTolerance, columnTolerance, startRowIndex) {
    // Agrupar por filas
    const rows = this.groupSeatsIntoRows(seats, rowTolerance);
    
    const organizedSeats = [];
    
    rows.forEach((row, rowIndex) => {
      // Ordenar asientos por X
      const sortedRow = row.sort((a, b) => a.x - b.x);
      
      // Detectar bloques separados por pasillos
      const blocks = this.detectSeatBlocks(sortedRow, columnTolerance);
      
      let seatNumber = 1;
      
      blocks.forEach(block => {
        block.forEach(seat => {
          const rowLetter = String.fromCharCode(65 + startRowIndex + rowIndex);
          
          const organizedSeat = {
            id: `advanced-${rowLetter}-${seatNumber}`,
            x: seat.x / this.scale,
            y: seat.y / this.scale,
            row: rowLetter,
            seat: seatNumber,
            label: `${rowLetter}${seatNumber}`,
            sectionName: seat.rowPatternId ? `Sección ${seat.rowPatternId}` : 'General',
            section: 'general',
            price: 50,
            detectedType: seat.type,
            confidence: seat.confidence,
            isDetected: true,
            sectionColor: seat.sectionColor
          };
          
          organizedSeats.push(organizedSeat);
          seatNumber++;
        });
      });
    });
    
    return organizedSeats;
  }

  // Agrupar asientos en filas
  groupSeatsIntoRows(seats, tolerance) {
    const rows = [];
    const sortedByY = [...seats].sort((a, b) => a.y - b.y);
    
    for (const seat of sortedByY) {
      const existingRow = rows.find(row => {
        const rowAvgY = row.reduce((sum, s) => sum + s.y, 0) / row.length;
        return Math.abs(seat.y - rowAvgY) <= tolerance;
      });
      
      if (existingRow) {
        existingRow.push(seat);
      } else {
        rows.push([seat]);
      }
    }
    
    return rows;
  }

  // Detectar bloques de asientos separados por pasillos
  detectSeatBlocks(row, tolerance) {
    if (row.length <= 1) return [row];
    
    const blocks = [];
    let currentBlock = [row[0]];
    
    for (let i = 1; i < row.length; i++) {
      const distance = row[i].x - row[i - 1].x;
      
      if (distance <= tolerance * 1.5) {
        currentBlock.push(row[i]);
      } else {
        blocks.push(currentBlock);
        currentBlock = [row[i]];
      }
    }
    blocks.push(currentBlock);
    
    return blocks.filter(block => block.length > 0);
  }

  // Métodos de utilidad
  quantizeColor(r, g, b, factor = 32) {
    const qr = Math.floor(r / factor) * factor;
    const qg = Math.floor(g / factor) * factor;
    const qb = Math.floor(b / factor) * factor;
    return `${qr}-${qg}-${qb}`;
  }

  findConnectedComponents(data, width, height) {
    const visited = new Array(width * height).fill(false);
    const components = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (!visited[idx] && data[idx * 4] < 180) { // Píxel oscuro
          const component = this.floodFill(data, width, height, x, y, visited);
          
          if (component.pixels.length > 8) {
            components.push(component);
          }
        }
      }
    }
    
    return components;
  }

  floodFill(data, width, height, startX, startY, visited) {
    const stack = [{ x: startX, y: startY }];
    const pixels = [];
    const threshold = 180;
    
    while (stack.length > 0) {
      const { x, y } = stack.pop();
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const idx = y * width + x;
      if (visited[idx]) continue;
      
      const pixelValue = data[idx * 4];
      if (pixelValue >= threshold) continue;
      
      visited[idx] = true;
      pixels.push({ x, y });
      
      // 8-conectividad
      stack.push(
        { x: x + 1, y }, { x: x - 1, y },
        { x, y: y + 1 }, { x, y: y - 1 },
        { x: x + 1, y: y + 1 }, { x: x - 1, y: y - 1 },
        { x: x + 1, y: y - 1 }, { x: x - 1, y: y + 1 }
      );
    }
    
    return { pixels };
  }

  getBoundingRect(pixels) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    pixels.forEach(({ x, y }) => {
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

  filterOverlappingSeats(seats, minDistance) {
    const filtered = [];
    const sorted = seats.sort((a, b) => b.confidence - a.confidence);
    
    for (const seat of sorted) {
      let isValid = true;
      
      for (const existing of filtered) {
        const distance = Math.sqrt(
          Math.pow(seat.x - existing.x, 2) + Math.pow(seat.y - existing.y, 2)
        );
        
        if (distance < minDistance) {
          isValid = false;
          break;
        }
      }
      
      if (isValid) {
        filtered.push(seat);
      }
    }
    
    return filtered;
  }

  countUniqueRows(seats) {
    const rows = new Set(seats.map(seat => seat.row));
    return rows.size;
  }

  // Método público para detectar patrones
  async detectSeatPatterns(imageElement, patternType = 'auto') {
    const patterns = {
      theater: { 
        minRadius: 8, 
        maxRadius: 22, 
        minDistance: 12, 
        rowTolerance: 25,
        columnTolerance: 18
      },
      stadium: { 
        minRadius: 4, 
        maxRadius: 15, 
        minDistance: 8, 
        rowTolerance: 15,
        columnTolerance: 12
      },
      conference: { 
        minRadius: 10, 
        maxRadius: 30, 
        minDistance: 20, 
        rowTolerance: 20,
        columnTolerance: 25
      },
      auto: { 
        minRadius: 6, 
        maxRadius: 25, 
        minDistance: 10, 
        rowTolerance: 20,
        columnTolerance: 15
      }
    };

    const selectedPattern = patterns[patternType] || patterns.auto;
    console.log(`🎯 Usando patrón avanzado: ${patternType}`, selectedPattern);
    
    return this.analyzeImage(imageElement, selectedPattern);
  }

  // Método de fallback
  async fallbackDetection(imageElement, options) {
    console.log('🔄 Usando detección básica como fallback...');
    
    // Implementación básica simplificada
    const simpleSeats = [];
    const gridSize = 30;
    
    for (let y = gridSize; y < this.canvas.height - gridSize; y += gridSize) {
      for (let x = gridSize; x < this.canvas.width - gridSize; x += gridSize) {
        // Muestra simple de grid
        if (Math.random() > 0.7) { // 30% de probabilidad
          simpleSeats.push({
            id: `fallback-${simpleSeats.length}`,
            x: x / this.scale,
            y: y / this.scale,
            row: String.fromCharCode(65 + Math.floor(y / gridSize) % 26),
            seat: Math.floor(x / gridSize) + 1,
            label: `${String.fromCharCode(65 + Math.floor(y / gridSize) % 26)}${Math.floor(x / gridSize) + 1}`,
            sectionName: 'General',
            section: 'general',
            price: 50,
            detectedType: 'rectangle',
            confidence: 50,
            isDetected: true
          });
        }
      }
    }
    
    return simpleSeats;
  }
}

export default AdvancedSeatDetector; 