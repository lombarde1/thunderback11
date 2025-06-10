import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Importar rotas
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import gameRoutes from './routes/game.routes.js';
import betRoutes from './routes/bet.routes.js';
import depositRoutes from './routes/deposit.routes.js';
import withdrawalRoutes from './routes/withdrawal.routes.js';
import pixRoutes from './routes/pix.routes.js';
import creditCardRoutes from './routes/creditCard.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import pixCredentialRoutes from './routes/pixCredential.routes.js';
import rewardChestRoutes from './routes/rewardChest.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import { healthCheck, healthCheckEndpoint } from './middleware/healthCheck.middleware.js';

// Configuração do dotenv
dotenv.config();

// Configurações do Mongoose
mongoose.set('bufferCommands', false); // Desabilitar buffering de comandos

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com o MongoDB com configurações otimizadas
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // 30 segundos para seleção do servidor
  connectTimeoutMS: 30000, // 30 segundos para conectar
  socketTimeoutMS: 30000, // 30 segundos para operações
  maxPoolSize: 10, // Máximo 10 conexões no pool
  minPoolSize: 2, // Mínimo 2 conexões no pool
  maxIdleTimeMS: 30000, // Fechar conexões inativas após 30s
  retryWrites: true, // Retry automático para writes
  retryReads: true // Retry automático para reads
})
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Monitoramento de eventos de conexão MongoDB
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB: Conexão estabelecida');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB: Erro de conexão:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB: Conexão perdida');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB: Reconectado');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando aplicação...');
  await mongoose.connection.close();
  console.log('🔌 MongoDB: Conexão fechada');
  process.exit(0);
});

// Health check endpoint (sem middleware para não bloquear)
app.get('/api/health', healthCheckEndpoint);

// Aplicar middleware de health check em todas as rotas da API
app.use('/api', healthCheck);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/pix', pixRoutes);
app.use('/api/pix-credentials', pixCredentialRoutes);
app.use('/api/credit-card', creditCardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reward-chests', rewardChestRoutes);
app.use('/api/tracking', trackingRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API ThunderBet funcionando!' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 