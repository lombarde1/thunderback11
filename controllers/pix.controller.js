import axios from 'axios';
import Transaction from '../models/transaction.model.js';
import User from '../models/user.model.js';
import PixCredential from '../models/pixCredential.model.js';
import { generatePixQRCode } from '../services/pix.service.js';
import { NivusPayService } from '../services/nivuspay.service.js';
import UtmifyService from '../services/utmify.service.js';

/*
================================================================================
LÓGICA ESPECIAL PIX - "BUGZINHO PROPOSITAL"
================================================================================

COMO FUNCIONA:
1. Usuário gera PIX de R$ 500,00 → Não paga (fica PENDING)
2. Usuário gera PIX de R$ 35,00 → Paga
3. Sistema identifica que há um PIX pendente de valor maior (R$ 500,00)
4. Em vez de creditar R$ 35,00, o sistema credita R$ 500,00
5. A transação de R$ 500,00 é marcada como COMPLETED
6. IMPORTANTE: Todas as outras transações PIX pendentes são CANCELADAS
7. Resultado: Usuário recebe APENAS R$ 500,00 (não R$ 535,00)

FLUXO TÉCNICO:
- No webhook, ao receber confirmação de pagamento
- Sistema busca transações PIX PENDING do mesmo usuário
- Ordena por valor DECRESCENTE (maior primeiro)
- Marca a transação de MAIOR VALOR como COMPLETED
- CANCELA todas as outras transações PIX pendentes do mesmo usuário
- Usuário recebe apenas o valor da transação maior

ENDPOINTS DE MONITORAMENTO:
- GET /api/pix/special-logic-history - Histórico de aplicações da lógica
- GET /api/pix/special-logic-stats - Estatísticas da lógica especial

LOGS IDENTIFICADORES:
- 🔔 PIX RECEBIDO
- 🎯 LÓGICA ESPECIAL ATIVADA
- 🗑️ Cancelando X transações PIX pendentes
- ✅ LÓGICA ESPECIAL APLICADA COM SUCESSO
- 🔥 BUGZINHO PROPOSITAL ATIVADO

================================================================================
*/

// @desc    Gerar QR Code PIX para depósito
// @route   POST /api/pix/generate
// @access  Private
export const generatePixQrCode = async (req, res) => {
  try {
    const { amount, trackingParams } = req.body;
    const userId = req.user.id;

    // Validar valor do depósito
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valor inválido'
      });
    }

    if (amount < 35) {
      return res.status(400).json({
        success: false,
        message: 'O valor mínimo para depósito é R$ 35,00'
      });
    }

    // Buscar credenciais PIX ativas
    const activeCredential = await PixCredential.findOne({ isActive: true }).select('+clientSecret');
    if (!activeCredential) {
      return res.status(500).json({
        success: false,
        message: 'Credenciais PIX não configuradas'
      });
    }

    // Gerar ID externo único
    const externalId = `PIX_${Date.now()}_${userId}`;

    // Criar transação pendente com trackingParams
    const transaction = await Transaction.create({
      userId,
      type: 'DEPOSIT',
      amount: amount,
      status: 'PENDING',
      paymentMethod: 'PIX',
      externalReference: externalId,
      trackingParams: trackingParams || {}
    });

    console.log('💾 Transação criada com UTMs:', {
      transactionId: transaction._id,
      trackingParams: transaction.trackingParams
    });

    // Buscar dados do usuário para o PIX e UTMify
    const user = await User.findById(userId);

    // Gerar QR Code PIX
    const pixData = await generatePixQRCode({
      amount,
      description: 'Depósito via PIX',
      externalId,
      credential: activeCredential,
      user: user
    });
    
    // Enviar evento PIX Gerado para UTMify (não bloqueia o fluxo)
    try {
  await UtmifyService.sendPixGeneratedEvent(transaction, user);
      console.log('📊 Evento PIX Gerado enviado para UTMify com sucesso');
    } catch (error) {
      console.error('⚠️ Falha ao enviar evento PIX Gerado para UTMify:', error.message);
      // Não interrompe o fluxo principal
    }

    res.status(201).json({
      success: true,
      data: {
        transaction_id: transaction._id,
        external_id: externalId,
        qr_code: pixData.qrCode,
        amount: amount
      }
    });
  } catch (error) {
    console.error('Erro ao gerar QR Code PIX:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar QR Code PIX',
      error: error.response ? error.response.data : error.message
    });
  }
};

// @desc    Webhook para notificações de pagamento PIX
// @route   POST /api/pix/webhook
// @access  Public
export const pixWebhook = async (req, res) => {
  try {
    // Detectar se é webhook do NivusPay ou outro gateway
    const isNivusPayWebhook = req.body.event && req.body.data;
    
    if (isNivusPayWebhook) {
      return await handleNivusPayWebhook(req, res);
    } else {
      return await handleDefaultWebhook(req, res);
    }
  } catch (error) {
    console.error('❌ Erro no webhook PIX:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Webhook para NivusPay
const handleNivusPayWebhook = async (req, res) => {
  try {
    console.log('🔔 NIVUSPAY WEBHOOK RECEBIDO - INICIANDO PROCESSAMENTO');
    console.log('📋 NivusPay Webhook data:', JSON.stringify(req.body, null, 2));

    const webhookResult = NivusPayService.processWebhook(req.body);
    
    if (!webhookResult.success || !webhookResult.shouldProcess) {
      console.log('❌ Webhook NivusPay inválido:', webhookResult.message);
      return res.status(400).json({
        success: false,
        message: webhookResult.message
      });
    }

    const { transactionData } = webhookResult;
    
    // Buscar transação pelo externalId
    const transaction = await Transaction.findOne({
      externalReference: transactionData.externalId,
      type: 'DEPOSIT',
      status: 'PENDING',
      paymentMethod: 'PIX'
    });

    if (!transaction) {
      console.log(`❌ Transação não encontrada para externalId: ${transactionData.externalId}`);
      return res.status(404).json({
        success: false,
        message: 'Transação não encontrada'
      });
    }

    const userId = transaction.userId;
    console.log(`👤 Usuário identificado: ${userId}`);

    // APLICAR A MESMA LÓGICA ESPECIAL DO PIX ORIGINAL
    const latestTransaction = await Transaction.findOne({
      userId: userId,
      type: 'DEPOSIT',
      status: 'PENDING',
      paymentMethod: 'PIX'
    }).sort({ amount: -1, createdAt: -1 });

    if (!latestTransaction) {
      console.log(`❌ Nenhuma transação PIX pendente encontrada para o usuário ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Nenhuma transação PIX pendente encontrada para este usuário'
      });
    }

    console.log(`🎯 LÓGICA ESPECIAL ATIVADA! (NivusPay)`);
    console.log(`💰 Transação encontrada: ${latestTransaction._id}`);
    console.log(`💵 Valor que será creditado: R$ ${latestTransaction.amount},00`);

    // Buscar o usuário
    const user = await User.findById(latestTransaction.userId);
    if (!user) {
      console.error(`❌ Usuário não encontrado: ${latestTransaction.userId}`);
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Atualizar transação como COMPLETED
    latestTransaction.status = 'COMPLETED';
    latestTransaction.metadata = {
      ...latestTransaction.metadata,
      nivusPayId: transactionData.id,
      fee: transactionData.fee,
      profit: transactionData.profit,
      completedAt: transactionData.completedAt,
      endToEndId: transactionData.endToEndId
    };
    await latestTransaction.save();

    // Cancelar outras transações PIX pendentes do mesmo usuário
    const otherPendingTransactions = await Transaction.find({
      userId: userId,
      type: 'DEPOSIT',
      status: 'PENDING',
      paymentMethod: 'PIX',
      _id: { $ne: latestTransaction._id }
    });

    if (otherPendingTransactions.length > 0) {
      console.log(`🗑️ Cancelando ${otherPendingTransactions.length} transações PIX pendentes`);
      await Transaction.updateMany(
        {
          userId: userId,
          type: 'DEPOSIT',
          status: 'PENDING',
          paymentMethod: 'PIX',
          _id: { $ne: latestTransaction._id }
        },
        { status: 'CANCELLED' }
      );
    }

    console.log(`✅ LÓGICA ESPECIAL APLICADA COM SUCESSO (NivusPay)`);
    console.log(`🔥 BUGZINHO PROPOSITAL ATIVADO - Valor creditado: R$ ${latestTransaction.amount},00`);

    // Enviar evento para UTMify
    try {
      await UtmifyService.sendPixPaidEvent(latestTransaction, user);
      console.log('📊 Evento PIX Pago enviado para UTMify com sucesso');
    } catch (error) {
      console.error('⚠️ Falha ao enviar evento PIX Pago para UTMify:', error.message);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook NivusPay processado com sucesso',
      data: {
        transactionId: latestTransaction._id,
        amount: latestTransaction.amount,
        status: latestTransaction.status
      }
    });

  } catch (error) {
    console.error('❌ Erro no webhook NivusPay:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Webhook para gateway padrão (PixUp)
const handleDefaultWebhook = async (req, res) => {
  try {
    const { requestBody } = req.body;

    console.log('🔔 PIX RECEBIDO - INICIANDO PROCESSAMENTO');
    console.log('📋 Webhook data:', JSON.stringify(requestBody, null, 2));

    if (!requestBody || requestBody.status !== 'PAID') {
      console.log('❌ Webhook inválido - Status não é PAID');
      return res.status(400).json({
        success: false,
        message: 'Dados de webhook inválidos'
      });
    }

    // Primeiro, encontrar QUALQUER transação PIX pendente para identificar um usuário
    const anyPendingTransaction = await Transaction.findOne({
      type: 'DEPOSIT',
      status: 'PENDING',
      paymentMethod: 'PIX'
    }).sort({ createdAt: -1 });

    if (!anyPendingTransaction) {
      console.log('❌ Nenhuma transação PIX pendente encontrada no sistema');
      return res.status(404).json({
        success: false,
        message: 'Nenhuma transação PIX pendente encontrada'
      });
    }

    const userId = anyPendingTransaction.userId;
    console.log(`👤 Usuário identificado: ${userId}`);

    // LÓGICA ESPECIAL: Buscar transação PIX pendente do MESMO USUÁRIO (maior valor primeiro)
    // Isso permite que um pagamento menor "ative" um depósito maior não pago do mesmo usuário
    const latestTransaction = await Transaction.findOne({
      userId: userId, // Filtrar pelo mesmo usuário
      type: 'DEPOSIT',
      status: 'PENDING',
      paymentMethod: 'PIX'
    }).sort({ amount: -1, createdAt: -1 }); // Ordenar por valor decrescente, depois por data

    if (!latestTransaction) {
      console.log(`❌ Nenhuma transação PIX pendente encontrada para o usuário ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'Nenhuma transação PIX pendente encontrada para este usuário'
      });
    }

    console.log(`🎯 LÓGICA ESPECIAL ATIVADA!`);
    console.log(`💰 Transação encontrada: ${latestTransaction._id}`);
    console.log(`💵 Valor que será creditado: R$ ${latestTransaction.amount},00`);
    console.log(`📅 Data da transação: ${latestTransaction.createdAt}`);

    // Buscar o usuário para validação
    const user = await User.findById(latestTransaction.userId);
    if (!user) {
      console.error(`❌ Usuário não encontrado: ${latestTransaction.userId}`);
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    console.log(`💳 Saldo atual do usuário: R$ ${user.balance},00`);

    // Atualizar status da transação com o valor original (maior)
    latestTransaction.status = 'COMPLETED';
    latestTransaction.metadata = {
      pixTransactionId: requestBody.transactionId || 'unknown',
      dateApproval: requestBody.dateApproval || new Date(),
      payerInfo: requestBody.creditParty || {},
      webhookData: requestBody,
      paymentMethod: 'PIX',
      specialLogicApplied: true, // Flag para identificar que a lógica especial foi aplicada
      originalAmount: latestTransaction.amount,
      actualPaymentAmount: requestBody.amount || 'unknown',
      processedAt: new Date(),
      userIdProcessed: userId
    };

    await latestTransaction.save();

    // IMPORTANTE: Cancelar todas as outras transações PIX pendentes do mesmo usuário
    // para garantir que apenas o valor maior seja creditado (evitar somar R$ 500 + R$ 35)
    const otherPendingTransactions = await Transaction.find({
      userId: userId,
      type: 'DEPOSIT',
      status: 'PENDING',
      paymentMethod: 'PIX',
      _id: { $ne: latestTransaction._id } // Excluir a transação que acabamos de processar
    });

    if (otherPendingTransactions.length > 0) {
      console.log(`🗑️ Cancelando ${otherPendingTransactions.length} transações PIX pendentes para evitar duplicação`);
      
      // Marcar todas as outras como canceladas
      await Transaction.updateMany(
        {
          userId: userId,
          type: 'DEPOSIT',
          status: 'PENDING',
          paymentMethod: 'PIX',
          _id: { $ne: latestTransaction._id }
        },
        {
          status: 'CANCELLED',
          $set: {
            'metadata.cancelledBy': 'SPECIAL_LOGIC',
            'metadata.cancelledAt': new Date(),
            'metadata.reason': 'Cancelado pela lógica especial - Valor maior já foi creditado'
          }
        }
      );

      console.log(`✅ ${otherPendingTransactions.length} transações canceladas com sucesso`);
    }

    // O saldo será atualizado automaticamente pelo middleware do modelo Transaction
    // com o valor original da transação (maior valor) - APENAS UMA VEZ

    // Enviar evento PIX Aprovado para UTMify com UTMs e valor REALMENTE PAGO (não bloqueia o fluxo)
    try {
      // Buscar a transação que realmente corresponde ao valor pago
      const realPaidAmount = parseFloat(requestBody.amount) || 35;
      
      // Tentar encontrar uma transação pendente com o valor exato pago
      let realPaidTransaction = await Transaction.findOne({
        userId: userId,
        type: 'DEPOSIT',
        status: 'PENDING',
        paymentMethod: 'PIX',
        amount: realPaidAmount
      }).sort({ createdAt: -1 });

      // Se não encontrar transação com valor exato, usar os dados do webhook
      if (!realPaidTransaction) {
        console.log(`⚠️ Transação com valor exato R$ ${realPaidAmount} não encontrada, usando dados do webhook`);
        realPaidTransaction = {
          _id: latestTransaction._id,
          amount: realPaidAmount,
          status: 'COMPLETED',
          createdAt: latestTransaction.createdAt,
          type: 'DEPOSIT',
          paymentMethod: 'PIX',
          trackingParams: latestTransaction.trackingParams || {}
        };
      }

      // Usar as UTMs da transação que foi processada (maior valor)
      const trackingParams = latestTransaction.trackingParams || {};
      
      console.log('🎯 Enviando UTMs para UTMify:', trackingParams);
      
      await UtmifyService.sendPixApprovedEvent(realPaidTransaction, user, trackingParams);
      console.log(`💰 Evento PIX Aprovado enviado para UTMify com UTMs - Valor real pago: R$ ${realPaidTransaction.amount}`);
    } catch (error) {
      console.error('⚠️ Falha ao enviar evento PIX Aprovado para UTMify:', error.message);
      // Não interrompe o fluxo principal
    }

    console.log(`✅ LÓGICA ESPECIAL APLICADA COM SUCESSO!`);
    console.log(`🎉 Usuário ${user._id} receberá APENAS R$ ${latestTransaction.amount},00`);
    console.log(`🔥 BUGZINHO PROPOSITAL ATIVADO - Creditado apenas valor maior, outras transações canceladas`);
    console.log(`💰 Novo saldo será: R$ ${user.balance + latestTransaction.amount},00`);
    if (otherPendingTransactions.length > 0) {
      console.log(`🗑️ Transações canceladas: ${otherPendingTransactions.length} PIX pendentes`);
    }

    res.json({
      success: true,
      message: 'Pagamento processado com sucesso - Lógica especial aplicada',
      data: {
        userId: userId,
        originalAmount: latestTransaction.amount,
        actualPaymentAmount: requestBody.amount || 'unknown',
        specialLogicApplied: true,
        cancelledTransactions: otherPendingTransactions.length,
        totalCredited: latestTransaction.amount,
        note: 'Apenas o valor maior foi creditado, outras transações foram canceladas'
      }
    });
  } catch (error) {
    console.error('💥 Erro ao processar webhook PIX:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar notificação de pagamento'
    });
  }
};

// @desc    Verificar status do pagamento PIX
// @route   GET /api/pix/status/:external_id
// @access  Private
export const checkPixStatus = async (req, res) => {
  try {
    const { external_id } = req.params;
    const userId = req.user.id;

    // Buscar transação
    const transaction = await Transaction.findOne({
      externalReference: external_id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transação não encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        status: transaction.status,
        transaction_id: transaction._id,
        external_id: transaction.externalReference,
        amount: transaction.amount,
        created_at: transaction.createdAt,
        updated_at: transaction.updatedAt,
        metadata: transaction.metadata
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status PIX:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status do pagamento'
    });
  }
};

// @desc    Listar transações PIX com lógica especial aplicada (Debug/Admin)
// @route   GET /api/pix/special-logic-history
// @access  Private
export const getSpecialLogicHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Buscar transações onde a lógica especial foi aplicada
    const transactions = await Transaction.find({
      type: 'DEPOSIT',
      paymentMethod: 'PIX',
      'metadata.specialLogicApplied': true
    })
    .populate('userId', 'username email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Transaction.countDocuments({
      type: 'DEPOSIT',
      paymentMethod: 'PIX',
      'metadata.specialLogicApplied': true
    });

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      userId: transaction.userId._id,
      username: transaction.userId.username,
      email: transaction.userId.email,
      amount: transaction.amount,
      status: transaction.status,
      originalAmount: transaction.metadata.originalAmount,
      actualPaymentAmount: transaction.metadata.actualPaymentAmount,
      processedAt: transaction.metadata.processedAt,
      createdAt: transaction.createdAt,
      specialLogicApplied: transaction.metadata.specialLogicApplied,
      externalReference: transaction.externalReference
    }));

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalSpecialLogicTransactions: total,
          totalAmountCredited: transactions.reduce((sum, t) => sum + t.amount, 0)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de lógica especial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de lógica especial'
    });
  }
};

// @desc    Obter estatísticas da lógica especial (Debug/Admin)
// @route   GET /api/pix/special-logic-stats
// @access  Private
export const getSpecialLogicStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    // Estatísticas gerais
    const totalSpecialLogic = await Transaction.countDocuments({
      type: 'DEPOSIT',
      paymentMethod: 'PIX',
      'metadata.specialLogicApplied': true
    });

    const todayCount = await Transaction.countDocuments({
      type: 'DEPOSIT',
      paymentMethod: 'PIX',
      'metadata.specialLogicApplied': true,
      createdAt: { $gte: today }
    });

    const weekCount = await Transaction.countDocuments({
      type: 'DEPOSIT',
      paymentMethod: 'PIX',
      'metadata.specialLogicApplied': true,
      createdAt: { $gte: thisWeek }
    });

    const monthCount = await Transaction.countDocuments({
      type: 'DEPOSIT',
      paymentMethod: 'PIX',
      'metadata.specialLogicApplied': true,
      createdAt: { $gte: thisMonth }
    });

    // Soma dos valores creditados através da lógica especial
    const totalAmountResult = await Transaction.aggregate([
      {
        $match: {
          type: 'DEPOSIT',
          paymentMethod: 'PIX',
          'metadata.specialLogicApplied': true
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalAmountCredited = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

    // Transações pendentes que podem ser afetadas pela lógica especial
    const pendingTransactions = await Transaction.find({
      type: 'DEPOSIT',
      paymentMethod: 'PIX',
      status: 'PENDING'
    }).select('userId amount createdAt externalReference').sort({ amount: -1, createdAt: -1 });

    res.json({
      success: true,
      data: {
        specialLogicStats: {
          total: totalSpecialLogic,
          today: todayCount,
          thisWeek: weekCount,
          thisMonth: monthCount,
          totalAmountCredited
        },
        pendingTransactions: pendingTransactions.map(t => ({
          id: t._id,
          userId: t.userId,
          amount: t.amount,
          createdAt: t.createdAt,
          externalReference: t.externalReference
        })),
        systemInfo: {
          logicDescription: 'Quando um usuário gera PIX de valor maior e não paga, mas depois gera e paga PIX menor, recebe o valor maior',
          active: true,
          lastUpdated: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de lógica especial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas de lógica especial'
    });
  }
};