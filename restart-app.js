import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔄 REINICIANDO APLICAÇÃO E LIMPANDO CONEXÕES');
console.log('=' .repeat(50));

async function restartApp() {
  try {
    console.log('🧹 Limpando conexões existentes...');
    
    // Fechar todas as conexões existentes
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('✅ Conexões MongoDB fechadas');
    }
    
    // Aguardar um momento
    console.log('⏳ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reconectar com configurações otimizadas
    console.log('🔗 Reconectando ao MongoDB...');
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
    
    console.log('✅ Reconectado com sucesso!');
    console.log('📍 Host:', mongoose.connection.host);
    console.log('📍 Database:', mongoose.connection.name);
    console.log('📍 Estado:', mongoose.connection.readyState);
    
    // Testar operação
    console.log('🧪 Testando operação...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Collections:', collections.length);
    
    console.log('🎉 Aplicação reiniciada com sucesso!');
    console.log('💡 Agora você pode reiniciar o servidor principal');
    
  } catch (error) {
    console.error('❌ Erro ao reiniciar:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado');
    process.exit(0);
  }
}

restartApp(); 