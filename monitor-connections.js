import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('📊 MONITOR DE CONEXÕES MONGODB');
console.log('=' .repeat(50));

// Configurar Mongoose
mongoose.set('bufferCommands', false);

let isConnected = false;
let connectionAttempts = 0;
let lastError = null;

// Função para conectar
async function connect() {
  try {
    connectionAttempts++;
    console.log(`🔄 Tentativa de conexão #${connectionAttempts}...`);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true
    });
    
    isConnected = true;
    lastError = null;
    console.log('✅ Conectado com sucesso!');
    
  } catch (error) {
    isConnected = false;
    lastError = error;
    console.error('❌ Erro de conexão:', error.message);
  }
}

// Eventos de monitoramento
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('🔗 Evento: Conectado');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  lastError = err;
  console.error('❌ Evento: Erro -', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('🔌 Evento: Desconectado');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('🔄 Evento: Reconectado');
});

// Função para testar operações
async function testOperations() {
  if (!isConnected) {
    console.log('⚠️ Não conectado - pulando teste');
    return;
  }
  
  try {
    // Testar ping
    const pingResult = await mongoose.connection.db.admin().ping();
    console.log('🏓 Ping:', pingResult.ok === 1 ? 'OK' : 'FALHOU');
    
    // Testar listagem de collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Collections:', collections.length);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Função de status
function showStatus() {
  const state = mongoose.connection.readyState;
  const stateNames = ['Desconectado', 'Conectado', 'Conectando', 'Desconectando'];
  
  console.log('\n📋 STATUS ATUAL:');
  console.log(`   Estado: ${state} (${stateNames[state]})`);
  console.log(`   Conectado: ${isConnected ? '✅' : '❌'}`);
  console.log(`   Tentativas: ${connectionAttempts}`);
  console.log(`   Último erro: ${lastError ? lastError.message : 'Nenhum'}`);
  console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
}

// Iniciar monitoramento
async function startMonitoring() {
  console.log('🚀 Iniciando monitoramento...\n');
  
  // Conectar inicialmente
  await connect();
  
  // Mostrar status a cada 10 segundos
  setInterval(() => {
    showStatus();
    testOperations();
  }, 10000);
  
  // Mostrar status inicial
  showStatus();
  await testOperations();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando monitor...');
  await mongoose.disconnect();
  process.exit(0);
});

startMonitoring().catch(console.error); 