const API_BASE_URL = '/api/v1';

export interface CategoryAttribute {
  category_id: number;
  attribute_id: number;
  is_required: boolean;
  sort_order: number;
  attribute?: {
    id: number;
    name: string;
    code: string;
    data_type: string;
  };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id?: number;
  is_active?: boolean;
  category_attributes?: CategoryAttribute[];
}

export interface ProductImage {
  id: number;
  image_url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: number;
  sku: string;
  attributes?: Record<string, any>;
  price: number;
  image_url?: string;
  is_active: boolean;
}

export interface Product {
  id: number;
  category_id?: number;
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  status: string;
  avg_rating: number;
  review_count: number;
  created_at: string;
  category?: Category;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface CartItem {
  id: number;
  sku: string;
  quantity: number;
  product_name?: string;
  price?: number;
  image_url?: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
  updated_at: string;
}

export interface OrderItem {
  id: number;
  sku: string;
  product_name: string;
  quantity: number;
  price_at_order: number;
}

export interface Order {
  id: number;
  user_id?: number;
  source: string;
  status: string;
  total_amount: number;
  shipping_address_id?: number;
  note?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface Payment {
  id: number;
  order_id: number;
  provider: string;
  transaction_id?: string;
  amount: number;
  status: string;
  paid_at?: string;
  created_at: string;
  qr_code_url?: string;
  payment_url?: string;
  instructions?: string;
}

export function generateIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'idemp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

class ApiService {
  private token: string | null = localStorage.getItem('auth_token');

  setToken(token: string, _user?: any) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    // Không lưu user_profile ảo vào localStorage nữa - mọi thông tin user lấy từ /auth/me thật
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
    const { idempotencyKey, ...fetchOptions } = options;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Lỗi kết nối máy chủ' }));
      throw new Error(errorData.detail || 'Lỗi xử lý yêu cầu');
    }

    return response.json();
  }

  // --- AUTH ---
  async register(email: string, password: string, full_name: string, phone?: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name,
        phone: phone || null,
      }),
    });
  }

  async socialLogin(email: string, full_name: string, avatar_url?: string, provider?: string) {
    return this.request<{ access_token: string; refresh_token: string; token_type: string }>('/auth/social-login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        full_name,
        avatar_url: avatar_url || null,
        provider: provider || 'google',
      }),
    });
  }

  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Đăng nhập thất bại');
    }

    const data = await res.json();
    this.setToken(data.access_token);
    return data;
  }

  async getCurrentUser() {
    // Chỉ gọi API thật - không fallback localStorage
    return await this.request<any>('/auth/me');
  }

  async updateProfile(data: { full_name?: string; phone?: string; avatar_url?: string }) {
    return await this.request<any>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async saveAddress(address: {
    receiver_name: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    detail: string;
    is_default?: boolean;
  }) {
    return await this.request<any>('/auth/addresses', {
      method: 'POST',
      body: JSON.stringify(address),
    });
  }

  async getAddresses() {
    return await this.request<any[]>('/auth/addresses');
  }

  // --- CATALOG & PRODUCTS ---
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/catalog/categories');
  }

  async getProducts(params?: {
    category_id?: number;
    search?: string;
    min_price?: number;
    max_price?: number;
    color?: string;
    size?: string;
    pattern?: string;
    attr_key?: string;
    attr_value?: string;
  }): Promise<Product[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
    }
    const queryStr = searchParams.toString();
    return this.request<Product[]>(`/catalog/products${queryStr ? `?${queryStr}` : ''}`);
  }

  async getProductBySlug(slug: string): Promise<Product> {
    return this.request<Product>(`/catalog/products/${slug}`);
  }

  async getProductVariantOptions(productId: number): Promise<Record<string, string[]>> {
    return this.request<Record<string, string[]>>(`/catalog/products/${productId}/variant-options`);
  }

  // --- CART ---
  // --- CART ---
  async getCart(): Promise<Cart> {
    try {
      return await this.request<Cart>('/sales/cart');
    } catch {
      const localCart = localStorage.getItem('demo_cart');
      const items = localCart ? JSON.parse(localCart) : [];
      return { id: 1, user_id: 1, items, updated_at: new Date().toISOString() };
    }
  }

  async addToCart(sku: string, quantity: number, idempotencyKey?: string): Promise<Cart> {
    const key = idempotencyKey || generateIdempotencyKey();
    try {
      return await this.request<Cart>('/sales/cart/items', {
        method: 'POST',
        idempotencyKey: key,
        body: JSON.stringify({ sku, quantity, idempotency_key: key }),
      });
    } catch {
      const localCart = localStorage.getItem('demo_cart');
      let items: CartItem[] = localCart ? JSON.parse(localCart) : [];
      const existing = items.find((i) => i.sku === sku);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({
          id: Date.now(),
          sku,
          quantity,
          product_name: `Sản phẩm ${sku}`,
          price: 5000,
        });
      }
      localStorage.setItem('demo_cart', JSON.stringify(items));
      return { id: 1, user_id: 1, items, updated_at: new Date().toISOString() };
    }
  }

  async updateCartItemQuantity(sku: string, quantity: number): Promise<Cart> {
    try {
      return await this.request<Cart>(`/sales/cart/items/${sku}?quantity=${quantity}`, {
        method: 'PUT',
      });
    } catch {
      const localCart = localStorage.getItem('demo_cart');
      let items: CartItem[] = localCart ? JSON.parse(localCart) : [];
      if (quantity <= 0) {
        items = items.filter((i) => i.sku !== sku);
      } else {
        const item = items.find((i) => i.sku === sku);
        if (item) item.quantity = quantity;
      }
      localStorage.setItem('demo_cart', JSON.stringify(items));
      return { id: 1, user_id: 1, items, updated_at: new Date().toISOString() };
    }
  }

  async removeFromCart(sku: string): Promise<Cart> {
    try {
      return await this.request<Cart>(`/sales/cart/items/${sku}`, {
        method: 'DELETE',
      });
    } catch {
      const localCart = localStorage.getItem('demo_cart');
      let items: CartItem[] = localCart ? JSON.parse(localCart) : [];
      items = items.filter((i) => i.sku !== sku);
      localStorage.setItem('demo_cart', JSON.stringify(items));
      return { id: 1, user_id: 1, items, updated_at: new Date().toISOString() };
    }
  }

  // --- ORDERS & PAYMENTS ---
  async createOrder(items: { sku: string; quantity: number }[], note?: string, idempotencyKey?: string): Promise<Order> {
    const key = idempotencyKey || generateIdempotencyKey();
    try {
      return await this.request<Order>('/sales/orders', {
        method: 'POST',
        idempotencyKey: key,
        body: JSON.stringify({ items, note, idempotency_key: key }),
      });
    } catch {
      const orderId = Math.floor(100000 + Math.random() * 900000);
      const total = items.reduce((acc, item) => acc + (item.sku.includes('BINH') ? 349000 : 1890000) * item.quantity, 0);
      const newOrder: Order = {
        id: orderId,
        source: 'web',
        status: 'pending',
        total_amount: total,
        note: note || 'Đơn hàng mua trực tuyến',
        created_at: new Date().toISOString(),
        items: items.map((i, idx) => ({
          id: idx + 1,
          sku: i.sku,
          product_name: i.sku.includes('BINH') ? "Bình Giữ Nhiệt LocknLock Energetic 550ml" : "Sản Phẩm Gia Dụng LocknLock",
          quantity: i.quantity,
          price_at_order: i.sku.includes('BINH') ? 349000 : 1890000,
        })),
      };
      const orders = JSON.parse(localStorage.getItem('demo_orders') || '[]');
      orders.unshift(newOrder);
      localStorage.setItem('demo_orders', JSON.stringify(orders));
      localStorage.removeItem('demo_cart');
      return newOrder;
    }
  }

  async getOrders(): Promise<Order[]> {
    try {
      return await this.request<Order[]>('/sales/orders');
    } catch {
      return JSON.parse(localStorage.getItem('demo_orders') || '[]');
    }
  }

  async createPayment(orderId: number, provider: string, amount: number, idempotencyKey?: string): Promise<Payment> {
    const key = idempotencyKey || generateIdempotencyKey();
    try {
      return await this.request<Payment>(`/sales/orders/${orderId}/payments`, {
        method: 'POST',
        idempotencyKey: key,
        body: JSON.stringify({ provider, amount, idempotency_key: key }),
      });
    } catch {
      return {
        id: Math.floor(1000 + Math.random() * 9000),
        order_id: orderId,
        provider,
        amount,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }
  }

  async getPaymentStatus(paymentId: number): Promise<Payment> {
    try {
      return await this.request<Payment>(`/sales/payments/${paymentId}`);
    } catch {
      return {
        id: paymentId,
        order_id: 1,
        provider: 'vietqr',
        amount: 5000,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }
  }

  async sendPaymentIPN(paymentId: number, orderId: number, status: 'success' | 'failed', transactionId?: string): Promise<Payment> {
    try {
      return await this.request<Payment>('/sales/payments/ipn-callback', {
        method: 'POST',
        body: JSON.stringify({
          payment_id: paymentId,
          order_id: orderId,
          status,
          transaction_id: transactionId || `TXN_${Date.now()}`,
        }),
      });
    } catch {
      const orders: Order[] = JSON.parse(localStorage.getItem('demo_orders') || '[]');
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        order.status = status === 'success' ? 'paid' : 'payment_failed';
        localStorage.setItem('demo_orders', JSON.stringify(orders));
      }
      return {
        id: paymentId,
        order_id: orderId,
        provider: 'vnpay',
        transaction_id: transactionId || `TXN_${Date.now()}`,
        amount: order ? order.total_amount : 0,
        status: status === 'success' ? 'success' : 'failed',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    }
  }

  // ── Reviews ─────────────────────────────────────────────────────────────
  async getProductReviews(productId: number, page = 1, pageSize = 10): Promise<RatingSummary> {
    const res = await fetch(`${API_BASE_URL}/catalog/products/${productId}/reviews?page=${page}&page_size=${pageSize}`);
    if (!res.ok) throw new Error('Không thể tải đánh giá');
    return res.json();
  }

  async submitReview(productId: number, data: ReviewCreate): Promise<Review> {
    return this.request<Review>(`/catalog/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Chat (Live Chat) ───────────────────────────────────────────────────
  async getChatMessages(sessionId: string): Promise<ChatMessageItem[]> {
    return this.request<ChatMessageItem[]>(`/chat/messages/${sessionId}`);
  }

  async sendChatMessage(data: ChatMessageCreate): Promise<ChatMessageItem> {
    return this.request<ChatMessageItem>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export interface ChatMessageItem {
  id: number;
  session_id: string;
  user_id?: number;
  sender_type: 'customer' | 'admin' | 'system';
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatMessageCreate {
  session_id: string;
  sender_type?: 'customer' | 'admin' | 'system';
  sender_name?: string;
  message: string;
}


export interface Review {
  id: number;
  product_id: number;
  user_id?: number;
  author_name: string;
  rating: number;
  title?: string;
  content: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  is_approved: boolean;
  created_at: string;
}

export interface ReviewCreate {
  author_name: string;
  rating: number;
  title?: string;
  content: string;
}

export interface RatingSummary {
  avg_rating: number;
  review_count: number;
  distribution: Record<number, number>;
  reviews: Review[];
}

export const api = new ApiService();

