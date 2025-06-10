import mongoose from 'mongoose';

/**
 * Middleware para verificar a saúde da conexão MongoDB
 */
export const healthCheck = (req, res, next) => {
  const connectionState = mongoose.connection.readyState;
  
  // 0 = desconectado, 1 = conectado, 2 = conectando, 3 = desconectando
  if (connectionState !== 1) {
    console.error(`❌ MongoDB não conectado. Estado: ${connectionState}`);
    return res.status(503).json({
      success: false,
      message: 'Serviço temporariamente indisponível - banco de dados não conectado',
      mongoState: connectionState
    });
  }
  
  next();
};

/**
 * Endpoint de health check
 */
export const healthCheckEndpoint = async (req, res) => {
  try {
    const connectionState = mongoose.connection.readyState;
    const dbName = mongoose.connection.name;
    const host = mongoose.connection.host;
    const port = mongoose.connection.port;
    
    // Testar ping no banco
    const pingResult = await mongoose.connection.db.admin().ping();
    
    res.json({
      success: true,
      status: 'healthy',
      mongodb: {
        connected: connectionState === 1,
        state: connectionState,
        database: dbName,
        host: host,
        port: port,
        ping: pingResult
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Health check falhou:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 