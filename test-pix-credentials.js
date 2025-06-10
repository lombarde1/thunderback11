import axios from 'axios';

// Configuração de teste
const API_BASE_URL = 'https://money2025-thunderback101.krkzfx.easypanel.host/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NDRjMzJhYjcyYTQ5NjZkMzdlY2NkMiIsImlhdCI6MTc0OTMzNjg3NCwiZXhwIjoxNzUxOTI4ODc0fQ.SBSJLH3sqNHssDAvNwvxTcd6vGEXCV4xU_jd3O-Rv6Y';

async function testPixCredentials() {
  console.log('🧪 TESTANDO CRIAÇÃO DE CREDENCIAIS PIX');
  console.log('=' .repeat(50));

  try {
    // Dados de teste para NivusPay
    const nivusPayData = {
      name: 'NivusPay Test',
      baseUrl: 'https://api.nivuspay.com',
      clientId: '', // Vazio para NivusPay
      clientSecret: 'pk_live_test_token',
      webhookUrl: 'https://test.com/webhook',
      provider: 'nivuspay',
      isActive: true
    };

    console.log('📋 Dados de teste NivusPay:');
    console.log(JSON.stringify(nivusPayData, null, 2));
    console.log('');

    // Teste 1: Criar credencial NivusPay
    console.log('🔄 Teste 1: Criando credencial NivusPay...');
    
    const response = await axios.post(`${API_BASE_URL}/pix-credentials`, nivusPayData, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Credencial NivusPay criada com sucesso!');
    console.log('📄 Resposta:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');

    // Teste 2: Listar credenciais
    console.log('🔄 Teste 2: Listando credenciais...');
    
    const listResponse = await axios.get(`${API_BASE_URL}/pix-credentials`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    console.log('✅ Credenciais listadas com sucesso!');
    console.log('📄 Total de credenciais:', listResponse.data.count);
    console.log('');

    // Teste 3: Dados de teste para PixUp (para comparação)
    const pixUpData = {
      name: 'PixUp Test',
      baseUrl: 'https://api.pixup.com',
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      webhookUrl: 'https://test.com/webhook',
      provider: 'pixup',
      isActive: true
    };

    console.log('🔄 Teste 3: Criando credencial PixUp (para comparação)...');
    
    const pixUpResponse = await axios.post(`${API_BASE_URL}/pix-credentials`, pixUpData, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Credencial PixUp criada com sucesso!');
    console.log('📄 Resposta:');
    console.log(JSON.stringify(pixUpResponse.data, null, 2));
    console.log('');

    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('=' .repeat(50));

    return {
      success: true,
      nivusPayCredential: response.data,
      pixUpCredential: pixUpResponse.data
    };

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.response?.data || error.message);
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Headers:', error.response?.headers);
    console.log('=' .repeat(50));

    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Executar teste
testPixCredentials()
  .then(result => {
    if (result.success) {
      console.log('✅ Teste de credenciais PIX funcionando!');
      process.exit(0);
    } else {
      console.log('❌ Falha no teste de credenciais PIX');
      console.log('Erro:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  }); 