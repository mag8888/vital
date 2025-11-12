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
    
    // Проверка наличия обязательных переменных
    const missingVars: string[] = [];
    if (!this.config.projectId) missingVars.push('LAVA_PROJECT_ID');
    if (!this.config.secretKey) missingVars.push('LAVA_SECRET_KEY');
    
    if (missingVars.length > 0) {
      console.error('❌ Lava Service: Missing required environment variables:', missingVars);
    }
    
    console.log('🔥 Lava Service Config:', {
      projectId: this.config.projectId ? `${this.config.projectId.substring(0, 4)}...` : 'MISSING',
      secretKeyLength: this.config.secretKey.length,
      baseUrl: this.config.baseUrl,
      hasProjectId: !!this.config.projectId,
      hasSecretKey: !!this.config.secretKey,
      webhookSecret: process.env.LAVA_WEBHOOK_SECRET ? 'SET' : 'MISSING',
      publicBaseUrl: process.env.PUBLIC_BASE_URL || 'NOT SET'
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

    // Убираем trailing slash из baseUrl и добавляем endpoint
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/invoice/create`;
    
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
