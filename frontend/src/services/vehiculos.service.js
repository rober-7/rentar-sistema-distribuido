const API_URL = 'http://localhost:3000/vehiculos'; 

// GET para obtener todos los vehículos
export const obtenerVehiculos = async () => {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) {
      throw new Error('Error en la respuesta de red');
    }
    // Convertimos la respuesta del backend a JSON
    const datos = await respuesta.json(); 
    return datos;
  } catch (error) {
    console.error("Hubo un problema al traer los vehículos:", error);
    return []; // Si falla, devolvemos una lista vacía para que no rompa la pantalla
  }
};

// POST para el alta de vehiculos
export const crearVehiculo = async (datosVehiculo) => {
  try {
    const respuesta = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datosVehiculo), // Convertimos los datos a formato JSON
    });
    
    if (!respuesta.ok) {
      // Capturamos el JSON del error que manda NestJS
      const errorData = await respuesta.json(); 
      const mensajeBackend = Array.isArray(errorData.message) 
        ? errorData.message.join('\n') 
        : errorData.message || 'Error desconocido en el servidor';
        
      // Lanzamos el error usando el texto exacto del backend
      throw new Error(mensajeBackend);
    }
    
    return await respuesta.json();
  } catch (error) {
    console.error("Error al crear:", error);
    throw error;
  }
};

// DELETE para la baja lógica del vehiculo
export const bajaVehiculo = async (id) => {
  try {
    // Le pegamos a la URL específica del vehículo (ej: /vehiculos/3)
    const respuesta = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    
    if (!respuesta.ok) {
      throw new Error('Error al intentar dar de baja el vehículo');
    }
    
    return true;
  } catch (error) {
    console.error("Error en la baja:", error);
    throw error;
  }
};

// PATCH para modificar un vehículo
export const modificarVehiculo = async (id, datosVehiculo) => {
  try {
    const respuesta = await fetch(`${API_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosVehiculo)
    });
    
    if (!respuesta.ok) {
      // Capturamos el JSON del error que manda NestJS
      const errorData = await respuesta.json(); 
      const mensajeBackend = Array.isArray(errorData.message) 
        ? errorData.message.join('\n') 
        : errorData.message || 'Error desconocido en el servidor';
        
      // Lanzamos el error usando el texto exacto del backend
      throw new Error(mensajeBackend);
    }
    
    return await respuesta.json();
  } catch (error) {
    console.error("Error al modificar:", error);
    throw error;
  }
};