import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🔍 DIAGNÓSTICO MONGODB');
console.log('=' .repeat(50));

// Verificar variáveis de ambiente
console.log('📋 Verificando variáveis de ambiente...');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Definida' : '❌ NÃO DEFINIDA');
console.log('NODE_ENV:', process.env.NODE_ENV || 'não definida');
console.log('');

// Função para testar conexão
async function testConnection() {
  console.log('🔄 Testando conexão MongoDB...');
  
  if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI não está definida!');
    console.log('💡 Crie um arquivo .env com:');
    console.log('   MONGODB_URI=mongodb://localhost:27017/thunderbet');
    console.log('   ou');
    console.log('   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/thunderbet');
    return;
  }

  // Mascarar senha na URL para log
  const maskedUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':***@');
  console.log('🔗 URI:', maskedUri);
  console.log('');

  try {
    console.log('⏳ Conectando...');
    
    // Configurar timeout menor para diagnóstico
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 segundos
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });

    console.log('✅ CONEXÃO ESTABELECIDA!');
    console.log('📍 Host:', conn.connection.host);
    console.log('📍 Porta:', conn.connection.port);
    console.log('📍 Database:', conn.connection.name);
    console.log('📍 Estado:', conn.connection.readyState);
    console.log('');

    // Testar operação simples
    console.log('🧪 Testando operação no banco...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Collections encontradas:', collections.length);
    collections.forEach(col => console.log('  -', col.name));
    console.log('');

    // Testar ping
    console.log('🏓 Testando ping...');
    const pingResult = await mongoose.connection.db.admin().ping();
    console.log('✅ Ping:', pingResult);

  } catch (error) {
    console.log('❌ ERRO DE CONEXÃO:');
    console.log('📋 Tipo:', error.name);
    console.log('📋 Mensagem:', error.message);
    console.log('📋 Código:', error.code);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('');
      console.log('💡 POSSÍVEIS SOLUÇÕES:');
      console.log('1. Verificar se MongoDB está rodando');
      console.log('2. Verificar credenciais (usuário/senha)');
      console.log('3. Verificar conectividade de rede');
      console.log('4. Verificar whitelist de IPs (MongoDB Atlas)');
      console.log('5. Verificar firewall/proxy');
    }
    
    if (error.name === 'MongoParseError') {
      console.log('');
      console.log('💡 PROBLEMA NA URI:');
      console.log('- Verificar formato da MONGODB_URI');
      console.log('- Exemplo: mongodb://localhost:27017/thunderbet');
      console.log('- Exemplo Atlas: mongodb+srv://user:pass@cluster.mongodb.net/thunderbet');
    }
  } finally {
    try {
      await mongoose.disconnect();
      console.log('🔌 Desconectado');
    } catch (err) {
      console.log('⚠️ Erro ao desconectar:', err.message);
    }
  }
}

// Verificar status atual do Mongoose
console.log('📊 Status atual do Mongoose:');
console.log('Estado da conexão:', mongoose.connection.readyState);
console.log('0 = desconectado, 1 = conectado, 2 = conectando, 3 = desconectando');
console.log('');

// Executar teste
testConnection().catch(console.error); 