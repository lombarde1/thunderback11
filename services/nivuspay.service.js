import axios from 'axios';

/**
 * Serviço para integração com o gateway NivusPay
 */
export class NivusPayService {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Gerar cobrança PIX via NivusPay
   * @param {Object} params - Parâmetros da cobrança
   * @param {number} params.amount - Valor da cobrança
   * @param {string} params.description - Descrição da cobrança
   * @param {string} params.externalId - ID externo da transação
   * @param {Object} params.customer - Dados do cliente
   * @returns {Object} Dados da cobrança criada
   */
  async generatePixBilling({ amount, description, externalId, customer }) {
    try {
      const url = `${this.baseUrl}/v1.0/Billing/Pix`;
      
      // Validar e limpar dados do cliente
      const cleanPhone = (customer.phone || '00000000000').replace(/\D/g, '');
      const cleanCpf = (customer.cpf || '00000000000').replace(/\D/g, '');
      
      // Garantir que o CPF tenha 11 dígitos
      const validCpf = cleanCpf.length === 11 ? cleanCpf : '47046074453'; // CPF de exemplo da documentação
      
      // Garantir que o telefone tenha pelo menos 10 dígitos
      const validPhone = cleanPhone.length >= 10 ? cleanPhone : '81993897392'; // Telefone de exemplo da documentação
      
      const data = {
        amount: parseFloat(amount),
        description: description || 'Depósito via PIX',
        externalId: externalId,
        customer: {
          email: customer?.email || 'teste@gmail.com',
          name: customer?.name || 'nome teste', // Corrigido: 'nome' -> 'name'
          taxId: validCpf,
          phone: validPhone
        }
      };

      console.log('📋 Dados enviados para NivusPay:', JSON.stringify(data, null, 2));

      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'apikey': this.apiKey // Header adicional conforme exemplo que funciona
        }
      });

      console.log('📄 Resposta NivusPay:', JSON.stringify(response.data, null, 2));

      if (!response.data.isValid) {
        console.error('❌ Resposta inválida do NivusPay:', response.data);
        throw new Error(JSON.stringify(response.data));
      }

      const result = response.data.result;
      
      return {
        id: result.id,
        amount: result.amount,
        status: result.status,
        externalId: result.externalId,
        qrCodeBase64: result.metadata?.qrCodeBase64,
        qrCodePayload: result.metadata?.qrCodePayload,
        fee: result.fee,
        profit: result.profit,
        createdAt: result.createdAt
      };

    } catch (error) {
      console.error('❌ Erro ao gerar cobrança PIX NivusPay:');
      console.error('📋 Status:', error.response?.status);
      console.error('📋 Headers:', error.response?.headers);
      console.error('📋 Data:', error.response?.data);
      console.error('📋 Message:', error.message);
      
      if (error.response?.data) {
        throw new Error(`Erro NivusPay: ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`Falha ao gerar cobrança PIX: ${error.message}`);
      }
    }
  }

  /**
   * Processar webhook do NivusPay
   * @param {Object} webhookData - Dados do webhook
   * @returns {Object} Dados processados
   */
  static processWebhook(webhookData) {
    try {
      const { event, data } = webhookData;

      // Verificar se é um evento de pagamento completado
      if (event !== 'pix.payment.completed') {
        return {
          success: false,
          message: 'Evento não é de pagamento completado',
          shouldProcess: false
        };
      }

      return {
        success: true,
        shouldProcess: true,
        transactionData: {
          id: data.id,
          externalId: data.externalId,
          amount: data.amount,
          status: 'COMPLETED',
          fee: data.fee,
          profit: data.profit,
          payer: data.metadata?.payer,
          endToEndId: data.metadata?.endToEndId,
          completedAt: data.updatedAt
        }
      };

    } catch (error) {
      console.error('Erro ao processar webhook NivusPay:', error);
      return {
        success: false,
        message: 'Erro ao processar webhook',
        shouldProcess: false
      };
    }
  }

  /**
   * Verificar status de uma cobrança
   * @param {string} billingId - ID da cobrança no NivusPay
   * @returns {Object} Status da cobrança
   */
  async checkBillingStatus(billingId) {
    try {
      const url = `${this.baseUrl}/v1.0/Billing/${billingId}`;
      
      const response = await axios.get(url, {
        headers: {
          'x-api-key': this.apiKey,
          'apikey': this.apiKey
        }
      });

      if (!response.data.isValid) {
        throw new Error(response.data.message || 'Erro ao consultar status');
      }

      const result = response.data.result;
      
      return {
        id: result.id,
        status: result.status,
        amount: result.amount,
        externalId: result.externalId,
        updatedAt: result.updatedAt
      };

    } catch (error) {
      console.error('Erro ao verificar status NivusPay:', error.response?.data || error.message);
      throw new Error(`Falha ao verificar status: ${error.response?.data?.message || error.message}`);
    }
  }
}

export default NivusPayService; 