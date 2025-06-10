import express from 'express';
import { 
  generatePixQrCode, 
  pixWebhook, 
  checkPixStatus,
  getSpecialLogicHistory,
  getSpecialLogicStats
} from '../controllers/pix.controller.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Rotas para usuários autenticados
router.post('/generate', verifyToken, generatePixQrCode);
router.get('/status/:external_id', verifyToken, checkPixStatus);

// Rotas para monitoramento da lógica especial (Debug/Admin)
router.get('/special-logic-history', verifyToken, getSpecialLogicHistory);
router.get('/special-logic-stats', verifyToken, getSpecialLogicStats);

// Webhook público para notificações de pagamento
router.post('/webhook', pixWebhook);

// Webhook específico para NivusPay (opcional - pode usar o mesmo webhook)
router.post('/webhook/nivuspay', pixWebhook);

export default router; 