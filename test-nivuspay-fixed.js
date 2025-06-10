import axios from 'axios';
// Teste com as correções baseadas no exemplo que funciona
async function testNivusPayFixed() {
  console.log('🧪 Testando NivusPay com correções...\n');

  const data = {
    amount: 35,
    description: "produto teste",
    externalId: "test_" + Date.now(),
    customer: {
      email: "teste@gmail.com",
      name: "dark", // Corrigido: usando 'name' em vez de 'nome'
      taxId: "47046074453",
      phone: "81993897392"
    }
  };

  const config = {
    method: 'post',
    url: 'https://api.nivuspay.com/v1.0/Billing/Pix',
    headers: { 
      'x-api-key': 'pk_live_mbioymy8_223d785b21953457f4e379d88d92701147079b4833164ed2fc9bf2963a6495d9', 
      'Content-Type': 'application/json',
      'apikey': 'pk_live_mbioymy8_223d785b21953457f4e379d88d92701147079b4833164ed2fc9bf2963a6495d9' // Header adicional
    },
    data: data
  };

  try {
    console.log('📤 Enviando requisição...');
    console.log('📋 Dados:', JSON.stringify(data, null, 2));
    
    const response = await axios.request(config);
    
    console.log('✅ SUCESSO!');
    console.log('📄 Resposta:', JSON.stringify(response.data, null, 2));
    
    if (response.data.result?.metadata?.qrCodeBase64) {
      console.log('🎯 QR Code gerado com sucesso!');
    }
    
  } catch (error) {
    console.log('❌ ERRO:');
    if (error.response) {
      console.log('📋 Status:', error.response.status);
      console.log('📋 Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('📋 Message:', error.message);
    }
  }
}

testNivusPayFixed(); 