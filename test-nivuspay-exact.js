import axios from 'axios';

// Teste EXATAMENTE igual ao exemplo que funciona
let data = JSON.stringify({
  "amount": 35,
  "description": "produto teste",
  "externalId": "1234",
  "customer": {
    "email": "teste@gmail.com",
    "name": "dark",
    "taxId": "47046074453",
    "phone": "81993897392"
  }
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://api.nivuspay.com/v1.0/Billing/Pix',
  headers: { 
    'x-api-key': 'pk_live_mbioymy8_223d785b21953457f4e379d88d92701147079b4833164ed2fc9bf2963a6495d9', 
    'Content-Type': 'application/json', 
    'apikey': 'pk_live_mbioymy8_223d785b21953457f4e379d88d92701147079b4833164ed2fc9bf2963a6495d9', 
    'Cookie': '__cf_bm=GdN8DO07Qi_1XXeqckErJwcTopZqWka4xJ8rlWbWEFI-1749337232-1.0.1.1-Tsbn62haoRQVwFYQJEIMCJ3LQV59BRrgvyC5TxVNgru6FdgR4WZIarx0qgwtiF8NkvrupqhBWCQDF.XjseaolxTOD73ljVVm0cQthECipeU'
  },
  data : data
};

console.log('🧪 Teste EXATO do exemplo que funciona...\n');

axios.request(config)
.then((response) => {
  console.log('✅ SUCESSO!');
  console.log(JSON.stringify(response.data, null, 2));
})
.catch((error) => {
  console.log('❌ ERRO:');
  if (error.response) {
    console.log('Status:', error.response.status);
    console.log('Data:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.log('Message:', error.message);
  }
}); 