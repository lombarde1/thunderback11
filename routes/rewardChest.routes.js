import express from 'express';
import {
  initializeRewardChests,
  getUserRewardChests,
  openRewardChest,
  getRewardChestStats,
  fixChestAmounts
} from '../controllers/rewardChest.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Rotas que requerem autenticação
router.use(verifyToken);

// Rotas para usuários autenticados
router.post('/initialize', initializeRewardChests);
router.get('/', getUserRewardChests);
router.post('/:chestNumber/open', openRewardChest);

// Rotas administrativas
router.get('/stats', isAdmin, getRewardChestStats);
router.post('/fix-amounts', fixChestAmounts); // Rota para corrigir valores (debug)

export default router; 