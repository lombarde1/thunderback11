import axios from 'axios';

// Configuração
const CONFIG = {
  baseUrl: 'https://api.nivuspay.com',
  apiKey: 'pk_live_mbioymy8_223d785b21953457f4e379d88d92701147079b4833164ed2fc9bf2963a6495d9'
};

// Dados exatos da documentação fornecida
const EXACT_DATA = {
  amount: 19.90,
  description: "produto teste",
  externalId: "1234",
  customer: {
    email: "teste@gmail.com",
    name: "nome teste", // Corrigido: 'nome' -> 'name'
    taxId: "47046074453",
    phone: "81993897392"
  }
};

async function testNivusPaySimple() {
  console.log('🧪 TESTE SIMPLES NIVUSPAY - DADOS EXATOS DA DOCUMENTAÇÃO');
  console.log('=' .repeat(70));

  try {
    const url = `${CONFIG.baseUrl}/v1.0/Billing/Pix`;
    
    console.log('🔧 URL:', url);
    console.log('🔑 API Key:', CONFIG.apiKey.substring(0, 25) + '...');
    console.log('');
    
    console.log('📋 Dados (exatos da documentação):');
    console.log(JSON.stringify(EXACT_DATA, null, 2));
    console.log('');

    console.log('🔄 Fazendo requisição...');
    
    const response = await axios.post(url, EXACT_DATA, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.apiKey,
        'apikey': CONFIG.apiKey // Header adicional necessário
      },
      timeout: 30000 // 30 segundos
    });

    console.log('✅ Resposta recebida!');
    console.log('📋 Status:', response.status);
    console.log('📋 Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.isValid) {
      console.log('🎉 SUCESSO! Cobrança criada com sucesso!');
      return { success: true, data: response.data };
    } else {
      console.log('❌ Resposta inválida:', response.data.message);
      return { success: false, error: response.data };
    }

  } catch (error) {
    console.error('❌ ERRO NA REQUISIÇÃO:');
    
    if (error.response) {
      console.error('📋 Status HTTP:', error.response.status);
      console.error('📋 Status Text:', error.response.statusText);
      console.error('📋 Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('📋 Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('📋 Erro de rede - sem resposta do servidor');
      console.error('📋 Request:', error.request);
    } else {
      console.error('📋 Erro na configuração:', error.message);
    }
    
    console.log('=' .repeat(70));
    return { success: false, error: error.message };
  }
}

// Teste adicional: verificar se a API está acessível
async function testApiHealth() {
  console.log('🏥 TESTE DE SAÚDE DA API');
  console.log('=' .repeat(40));
  
  try {
    // Tentar uma requisição simples para ver se a API responde
    const response = await axios.get(`${CONFIG.baseUrl}`, {
      timeout: 10000,
      validateStatus: () => true // Aceitar qualquer status
    });
    
    console.log('📋 Status da API:', response.status);
    console.log('📋 Headers:', response.headers);
    
    if (response.status < 500) {
      console.log('✅ API está acessível');
      return true;
    } else {
      console.log('❌ API com problemas (status 5xx)');
      return false;
    }
    
  } catch (error) {
    console.error('❌ API inacessível:', error.message);
    return false;
  }
}

// Executar testes
async function runAllTests() {
  console.log('🚀 INICIANDO TESTES NIVUSPAY');
  console.log('=' .repeat(70));
  console.log('');
  
  // Teste 1: Saúde da API
  const apiHealthy = await testApiHealth();
  console.log('');
  
  if (!apiHealthy) {
    console.log('❌ API não está acessível. Abortando testes.');
    process.exit(1);
  }
  
  // Teste 2: Criar cobrança
  const result = await testNivusPaySimple();
  
  if (result.success) {
    console.log('✅ Todos os testes passaram!');
    process.exit(0);
  } else {
    console.log('❌ Teste falhou');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
}); 