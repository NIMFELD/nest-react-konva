# 🎫 Seat.io POC - Prueba de Concepto

Este es un POC (Proof of Concept) completo para integrar **Seat.io** en una aplicación web usando **NestJS** como backend y **React** como frontend.

## 📋 Características

- ✅ **Backend NestJS** con API REST para manejar eventos
- ✅ **Frontend React** con interfaz moderna y responsiva
- ✅ **Integración completa con Seat.io API**
- ✅ **Visualización de mapas de asientos**
- ✅ **Selección múltiple de asientos**
- ✅ **Reserva y compra de asientos**
- ✅ **Gestión de eventos**
- ✅ **Diseño moderno con gradientes y glassmorphism**

## 🚀 Configuración Rápida

### 1. Obtener credenciales de Seat.io

1. Regístrate en [Seat.io](https://www.seats.io/)
2. Crea un workspace
3. Obtén tu **Secret Key** y **Public Key**
4. (Opcional) Crea un chart de prueba en el dashboard

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp env.example .env

# Editar .env con tus credenciales
# SEATIO_SECRET_KEY=tu-secret-key-aqui
# SEATIO_PUBLIC_KEY=tu-public-key-aqui
```

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
pnpm install
```

### 4. Ejecutar la aplicación

En terminales separadas:

```bash
# Terminal 1 - Backend (puerto 3001)
cd backend
pnpm run dev

# Terminal 2 - Frontend (puerto 3000)  
cd frontend
pnpm start
```

La aplicación estará disponible en `http://localhost:3000`

## 🛠️ Estructura del Proyecto

```
├── backend/
│   ├── src/
│   │   ├── events/
│   │   │   ├── events.controller.ts    # Controlador REST API
│   │   │   ├── events.service.ts       # Lógica de negocio
│   │   │   └── events.module.ts        # Módulo NestJS
│   │   ├── app.module.ts               # Módulo principal
│   │   └── main.ts                     # Punto de entrada
│   ├── package.json
│   ├── tsconfig.json
│   └── env.example
└── frontend/
    ├── src/
    │   ├── App.js                      # Componente principal
    │   ├── App.css                     # Estilos modernos
    │   └── SeatMap.js                  # Componente del mapa
    └── package.json
```

## 📡 API Endpoints

### Configuración
- `GET /events/config` - Obtener public key

### Eventos
- `GET /events` - Listar todos los eventos
- `GET /events/:eventKey` - Obtener evento específico
- `POST /events` - Crear nuevo evento

### Reservas
- `POST /events/:eventKey/reserve` - Reservar asientos
- `POST /events/:eventKey/book` - Comprar asientos

## 🎨 Funcionalidades del Frontend

### Panel de Eventos
- Lista de eventos disponibles
- Creación de eventos de prueba
- Selección de eventos

### Mapa de Asientos
- Visualización interactiva del mapa
- Selección múltiple de asientos
- Zoom y pantalla completa
- Leyenda de estados

### Gestión de Reservas
- Vista de asientos seleccionados
- Botones para reservar o comprar
- Feedback visual de acciones

## 🎯 Cómo Usar

1. **Iniciar la aplicación** siguiendo los pasos de configuración
2. **Crear un evento** usando el botón "Crear Evento de Prueba"
3. **Seleccionar el evento** de la lista
4. **Interactuar con el mapa** seleccionando asientos
5. **Reservar o comprar** usando los botones correspondientes

## ⚠️ Notas Importantes

### Para Desarrollo
- Asegúrate de tener un chart creado en Seat.io antes de crear eventos
- El backend corre en puerto **3001** y el frontend en **3000**
- Las CORS están configuradas para desarrollo local

### Para Producción
- Configura las variables de entorno apropiadas
- Actualiza las URLs del frontend para apuntar a tu API de producción
- Considera implementar autenticación y autorización
- Añade validación de datos más robusta

## 🔧 Personalización

### Estilos
Los estilos están en `frontend/src/App.css` y usan:
- CSS Variables para temas
- Gradientes modernos
- Glassmorphism effects
- Responsive design

### Configuración de Seat.io
En `SeatMap.js` puedes modificar:
- Colores del mapa
- Opciones de zoom
- Formateo de precios
- Callbacks de eventos

## 🚨 Solución de Problemas

### Error de CORS
Si tienes problemas de CORS, verifica que:
- El backend esté corriendo en puerto 3001
- La configuración de CORS en `main.ts` sea correcta

### Error de API Key
Si los mapas no cargan:
- Verifica que las API keys estén correctas en el `.env`
- Asegúrate de que el public key sea válido

### Error al crear eventos
Si falla la creación de eventos:
- Verifica que tengas un chart creado en Seat.io
- Usa el `chartKey` correcto en la función `createSampleEvent`

## 📚 Recursos Adicionales

- [Documentación de Seat.io](https://docs.seats.io/)
- [NestJS Documentation](https://nestjs.com/)
- [React Documentation](https://react.dev/)

## 🤝 Contribuir

Este es un POC básico. Posibles mejoras:
- Añadir autenticación
- Implementar WebSockets para actualizaciones en tiempo real
- Añadir tests unitarios
- Mejorar manejo de errores
- Añadir internacionalización

---

**¡Listo para usar!** 🚀 Cualquier duda, revisa la documentación oficial de Seat.io o los comentarios en el código. 