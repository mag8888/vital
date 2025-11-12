import crypto from 'crypto';
import axios from 'axios';

interface LavaConfig {
  projectId: string;
  secretKey: string;
  baseUrl: string;
}

interface CreateInvoiceRequest {
  sum: number;
  orderId: string;
  hookUrl?: string;
  successUrl?: string;
  failUrl?: string;
  customFields?: Record<string, string>;
  comment?: string;
}

interface CreateInvoiceResponse {
  data: {
    id: string;
    url: string;
    shortUrl: string;
    sum: number;
    orderId: string;
    status: string;
  };
  status: string;
}

class LavaService {
  private config: LavaConfig;

  constructor() {
    this.config = {
      projectId: process.env.LAVA_PROJECT_ID || '',
      secretKey: process.env.LAVA_SECRET_KEY || '',
      baseUrl: process.env.LAVA_BASE_URL || 'https://api.lava.top'
    };
    
    console.log('🔥 Lava Service Config:', {
      projectId: this.config.projectId,
      secretKeyLength: this.config.secretKey.length,
      baseUrl: this.config.baseUrl,
      hasProjectId: !!this.config.projectId,
      hasSecretKey: !!this.config.secretKey
    });
  }

  /**
   * Создание подписи для запроса
   */
  private createSignature(data: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Создание инвойса
   */
  async createInvoice(request: CreateInvoiceRequest): Promise<CreateInvoiceResponse> {
    const timestamp = Math.floor(Date.now() / 1000);
    const data = JSON.stringify(request);
    const signature = this.createSignature(data);

    const url = `${this.config.baseUrl}/invoice/create`;
    
    console.log('🔥 Lava API Request:', {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.secretKey.substring(0, 10)}...`,
        'X-Project-Id': this.config.projectId,
        'X-Signature': signature.substring(0, 20) + '...',
        'X-Timestamp': timestamp.toString()
      },
      body: request
    });

    try {
      const response = await axios.post(
        url,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.secretKey}`,
            'X-Project-Id': this.config.projectId,
            'X-Signature': signature,
            'X-Timestamp': timestamp.toString()
          }
        }
      );

      console.log('✅ Lava API Response:', {
        status: response.status,
        data: response.data
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Lava API Error Details:', {
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        request: {
          method: error.config?.method,
          url: error.config?.url,
          headers: error.config?.headers
        }
      });
      throw new Error(`Failed to create invoice: ${error.response?.data || error.message}`);
    }
  }

  /**
   * Получение статуса инвойса
   */
  async getInvoiceStatus(invoiceId: string): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const data = JSON.stringify({ invoiceId });
    const signature = this.createSignature(data);

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/invoice/status`,
        { invoiceId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.secretKey}`,
            'X-Project-Id': this.config.projectId,
            'X-Signature': signature,
            'X-Timestamp': timestamp.toString()
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Lava API Error:', error);
      throw new Error('Failed to get invoice status');
    }
  }

  /**
   * Проверка webhook подписи
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = process.env.LAVA_WEBHOOK_SECRET || this.config.secretKey;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

export const lavaService = new LavaService();
