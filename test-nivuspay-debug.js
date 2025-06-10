import { NivusPayService } from './services/nivuspay.service.js';

// Configurações reais
const REAL_CONFIG = {
  baseUrl: 'https://api.nivuspay.com',
  apiKey: 'pk_live_mbioymy8_223d785b21953457f4e379d88d92701147079b4833164ed2fc9bf2963a6495d9'
};

// Dados de teste com valores válidos
const TEST_DATA = {
  amount: 19.90,
  description: 'Teste de integração ThunderBet',
  externalId: `THUNDERBET_${Date.now()}`,
  customer: {
    email: 'teste@thunderbet.com',
    name: 'Usuario ThunderBet',
    cpf: '47046074453', // CPF válido da documentação
    phone: '81993897392' // Telefone válido da documentação
  }
};

async function testNivusPayDebug() {
  console.log('🧪 TESTE DE DEBUG NIVUSPAY - TOKEN REAL');
  console.log('=' .repeat(60));

  try {
    // Criar instância do serviço
    const nivusPayService = new NivusPayService(REAL_CONFIG.baseUrl, REAL_CONFIG.apiKey);
    
    console.log('🔧 Configuração:');
    console.log('   Base URL:', REAL_CONFIG.baseUrl);
    console.log('   API Key:', REAL_CONFIG.apiKey.substring(0, 20) + '...');
    console.log('');

    console.log('📋 Dados do teste:');
    console.log(JSON.stringify(TEST_DATA, null, 2));
    console.log('');

    // Teste: Gerar cobrança PIX
    console.log('🔄 Gerando cobrança PIX...');
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    const billing = await nivusPayService.generatePixBilling(TEST_DATA);
    
    console.log('✅ Cobrança PIX gerada com sucesso!');
    console.log('📄 Resultado:');
    console.log(JSON.stringify(billing, null, 2));
    console.log('');

    // Verificar se temos QR Code
    if (billing.qrCodeBase64) {
      console.log('✅ QR Code Base64 gerado!');
      console.log('📏 Tamanho:', billing.qrCodeBase64.length, 'caracteres');
    } else {
      console.log('❌ QR Code Base64 não encontrado!');
    }

    if (billing.qrCodePayload) {
      console.log('✅ QR Code Payload gerado!');
      console.log('📄 Payload:', billing.qrCodePayload.substring(0, 50) + '...');
    } else {
      console.log('❌ QR Code Payload não encontrado!');
    }

    console.log('');
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('=' .repeat(60));
    
    return {
      success: true,
      billing
    };

  } catch (error) {
    console.error('❌ ERRO NO TESTE:');
    console.error('📋 Tipo:', error.constructor.name);
    console.error('📋 Mensagem:', error.message);
    
    // Tentar parsear se for JSON
    try {
      const errorData = JSON.parse(error.message);
      console.error('📋 Dados do erro:', JSON.stringify(errorData, null, 2));
    } catch (parseError) {
      console.error('📋 Erro não é JSON válido');
    }
    
    console.log('=' .repeat(60));
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar teste
testNivusPayDebug()
  .then(result => {
    if (result.success) {
      console.log('✅ Integração NivusPay funcionando com token real!');
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