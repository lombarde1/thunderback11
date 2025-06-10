import { NivusPayService } from './services/nivuspay.service.js';

// Configurações de teste
const TEST_CONFIG = {
  baseUrl: 'https://api.nivuspay.com',
  apiKey: 'pk_live_mbjytcva_31d58ea8dd9485ff85366d81e20b81e75d535839acbcf8b3a74a7ef721a01bc7' // Token de exemplo da documentação
};

// Dados de teste
const TEST_DATA = {
  amount: 19.90,
  description: 'Teste de integração NivusPay',
  externalId: `TEST_${Date.now()}`,
  customer: {
    email: 'teste@gmail.com',
    name: 'Usuário Teste',
    cpf: '47046074453',
    phone: '81993897392'
  }
};

async function testNivusPayIntegration() {
  console.log('🧪 INICIANDO TESTE DE INTEGRAÇÃO NIVUSPAY');
  console.log('=' .repeat(50));

  try {
    // Criar instância do serviço
    const nivusPayService = new NivusPayService(TEST_CONFIG.baseUrl, TEST_CONFIG.apiKey);
    
    console.log('📋 Dados do teste:');
    console.log(JSON.stringify(TEST_DATA, null, 2));
    console.log('');

    // Teste 1: Gerar cobrança PIX
    console.log('🔄 Teste 1: Gerando cobrança PIX...');
    const billing = await nivusPayService.generatePixBilling(TEST_DATA);
    
    console.log('✅ Cobrança PIX gerada com sucesso!');
    console.log('📄 Resposta:');
    console.log(JSON.stringify(billing, null, 2));
    console.log('');

    // Teste 2: Verificar status da cobrança
    console.log('🔄 Teste 2: Verificando status da cobrança...');
    const status = await nivusPayService.checkBillingStatus(billing.id);
    
    console.log('✅ Status verificado com sucesso!');
    console.log('📄 Status:');
    console.log(JSON.stringify(status, null, 2));
    console.log('');

    // Teste 3: Simular webhook
    console.log('🔄 Teste 3: Simulando processamento de webhook...');
    const webhookData = {
      event: 'pix.payment.completed',
      data: {
        id: billing.id,
        externalId: billing.externalId,
        amount: billing.amount,
        status: 'completed',
        fee: 2.23,
        profit: 17.67,
        metadata: {
          payer: null,
          endToEndId: 'E12345678202412345678901234567890'
        },
        updatedAt: new Date().toISOString()
      }
    };

    const webhookResult = NivusPayService.processWebhook(webhookData);
    
    console.log('✅ Webhook processado com sucesso!');
    console.log('📄 Resultado:');
    console.log(JSON.stringify(webhookResult, null, 2));
    console.log('');

    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('=' .repeat(50));
    
    return {
      success: true,
      billing,
      status,
      webhookResult
    };

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    console.error('📋 Detalhes do erro:', error);
    console.log('=' .repeat(50));
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar teste se o arquivo for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testNivusPayIntegration()
    .then(result => {
      if (result.success) {
        console.log('✅ Integração NivusPay funcionando corretamente!');
        process.exit(0);
      } else {
        console.log('❌ Falha na integração NivusPay');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

export { testNivusPayIntegration }; 