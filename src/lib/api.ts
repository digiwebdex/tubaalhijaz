// Self-hosted API client for Tuba Al Hijaz
// All calls go to the VPS backend at VITE_API_URL (default '/api').
// No external SDK dependencies.

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Token management
class TokenManager {
  private static ACCESS_KEY = 'rk_access_token';
  private static REFRESH_KEY = 'rk_refresh_token';
  private static USER_KEY = 'rk_user';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  static setTokens(access: string, refresh: string) {
    localStorage.setItem(this.ACCESS_KEY, access);
    localStorage.setItem(this.REFRESH_KEY, refresh);
  }

  static setUser(user: any) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static getUser(): any {
    const u = localStorage.getItem(this.USER_KEY);
    return u ? JSON.parse(u) : null;
  }

  static clear() {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

const hasCustomSession = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(TokenManager.getAccessToken() && TokenManager.getUser());
};

// Fetch wrapper with auto-refresh
async function apiFetch(path: string, options: RequestInit & { skipRedirect?: boolean } = {}): Promise<any> {
  const { skipRedirect, ...fetchOptions } = options;
  const token = TokenManager.getAccessToken();
  const refreshToken = TokenManager.getRefreshToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });

  // Auto-refresh on 401 when we had an authenticated session
  if (res.status === 401 && token) {
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          TokenManager.setTokens(data.access_token, data.refresh_token);
          headers['Authorization'] = `Bearer ${data.access_token}`;
          res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });
        }
      } catch {
        // Refresh endpoint unreachable, fall through
      }
    }

    // If still unauthorized, clear tokens but only redirect for non-auth-check paths
    if (res.status === 401) {
      TokenManager.clear();
      if (!skipRedirect && !path.startsWith('/auth/')) {
        window.location.href = '/auth';
      }
      throw new Error('Session expired');
    }
  }

  return res;
}

// =============================================
// Auth API
// =============================================
export const auth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const resData = await res.json().catch(() => null);
      if (res.ok && resData) {
        const user = { ...resData.user, roles: resData.roles || [] };
        TokenManager.setTokens(resData.access_token, resData.refresh_token);
        TokenManager.setUser(user);
        return {
          data: {
            user,
            session: {
              user: { id: user.id, email: user.email },
              access_token: resData.access_token,
            },
          },
          error: null,
        };
      }

      if (resData?.error) {
        return { data: null, error: { message: resData.error } };
      }
    } catch {
      // network error — fall through
    }

    return { data: null, error: { message: 'Login failed. Please try again.' } };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: any } }) {
    try {
      const res = await fetch(`${API_URL}/auth/customer-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: options?.data?.full_name,
          phone: options?.data?.phone,
        }),
      });
      const resData = await res.json().catch(() => null);
      if (res.ok && resData) {
        const user = { ...resData.user, roles: resData.roles || ['user'] };
        TokenManager.setTokens(resData.access_token, resData.refresh_token);
        TokenManager.setUser(user);
        return {
          data: {
            user,
            session: { user: { id: user.id, email: user.email }, access_token: resData.access_token },
          },
          error: null,
        };
      }
      return { data: null, error: { message: resData?.error || 'Registration failed' } };
    } catch {
      return { data: null, error: { message: 'Registration failed. Please try again.' } };
    }
  },

  async signOut() {
    if (hasCustomSession()) {
      try { await apiFetch('/auth/logout', { method: 'POST', skipRedirect: true }); } catch {}
    }
    TokenManager.clear();
    return { error: null };
  },

  async getSession() {
    const token = TokenManager.getAccessToken();
    const user = TokenManager.getUser();
    if (token && user) {
      return { data: { session: { user: { id: user.id, email: user.email }, access_token: token } } };
    }

    return { data: { session: null } };
  },

  async getUser() {
    const localUser = TokenManager.getUser();
    const token = TokenManager.getAccessToken();

    if (token || localUser) {
      try {
        const res = await apiFetch('/auth/me', { skipRedirect: true });
        if (res.ok) {
          const resData = await res.json();
          const freshUser = { ...(resData?.user || {}), roles: resData?.roles || [] };
          TokenManager.setUser(freshUser);
          return { data: { user: freshUser } };
        }
      } catch {
        // Auth check failed silently - fall through to cached user
      }

      if (!localUser) return { data: { user: null } };
      return { data: { user: { id: localUser.id, email: localUser.email, ...localUser } } };
    }

    return { data: { user: null } };
  },

  async resetPasswordForEmail(email: string, _options?: any) {
    const res = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const resData = await res.json();
    if (!res.ok) return { error: { message: resData.error } };
    return { error: null };
  },

  async updateUser({ password }: { password: string }) {
    const res = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: new URLSearchParams(window.location.search).get('token'), password }),
    });
    const resData = await res.json();
    if (!res.ok) return { error: { message: resData.error } };
    return { data: {}, error: null };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (hasCustomSession()) {
      const token = TokenManager.getAccessToken();
      const user = TokenManager.getUser();
      callback('SIGNED_IN', { user: { id: user.id, email: user.email }, access_token: token });
      const handler = (e: StorageEvent) => {
        if (e.key === 'rk_access_token') {
          if (e.newValue) callback('SIGNED_IN', { user: TokenManager.getUser(), access_token: e.newValue });
          else callback('SIGNED_OUT', null);
        }
      };
      window.addEventListener('storage', handler);
      return { data: { subscription: { unsubscribe: () => window.removeEventListener('storage', handler) } } };
    }

    // Fallback: localStorage-based
    const token = TokenManager.getAccessToken();
    const user = TokenManager.getUser();
    if (token && user) {
      callback('SIGNED_IN', { user: { id: user.id, email: user.email }, access_token: token });
    }
    const handler = (e: StorageEvent) => {
      if (e.key === 'rk_access_token') {
        if (e.newValue) callback('SIGNED_IN', { user: TokenManager.getUser(), access_token: e.newValue });
        else callback('SIGNED_OUT', null);
      }
    };
    window.addEventListener('storage', handler);
    return { data: { subscription: { unsubscribe: () => window.removeEventListener('storage', handler) } } };
  },

  async setSession(session: { access_token: string; refresh_token: string }) {
    TokenManager.clear();

    return { error: { message: 'Authentication client unavailable' } };
  },
};

// =============================================
// Table name mapping (kebab-case for URLs)
// =============================================
const tableUrlMap: Record<string, string> = {
  bookings: '/bookings',
  payments: '/payments',
  expenses: '/expenses',
  transactions: '/transactions',
  profiles: '/profiles',
  packages: '/packages',
  hotels: '/hotels',
  hotel_rooms: '/hotel-rooms',
  hotel_bookings: '/hotel-bookings',
  accounts: '/accounts',
  moallems: '/moallems',
  moallem_payments: '/moallem-payments',
  moallem_commission_payments: '/moallem-commission-payments',
  supplier_agents: '/supplier-agents',
  supplier_agent_payments: '/supplier-agent-payments',
  supplier_contracts: '/supplier-contracts',
  supplier_contract_payments: '/supplier-contract-payments',
  booking_members: '/booking-members',
  booking_documents: '/booking-documents',
  site_content: '/site-content',
  cms_versions: '/cms-versions',
  company_settings: '/company-settings',
  blog_posts: '/blog-posts',
  notification_logs: '/notification-logs',
  notification_settings: '/notification-settings',
  installment_plans: '/installment-plans',
  user_roles: '/user-roles',
  financial_summary: '/financial-summary',
  otp_codes: '/otp-codes',
  daily_cashbook: '/daily-cashbook',
  moallem_items: '/moallem-items',
  supplier_agent_items: '/supplier-agent-items',
  refunds: '/refunds',
  cancellation_policies: '/cancellation-policies',
  audit_logs: '/audit-logs',
};

// =============================================
// Query Builder
// =============================================
class QueryBuilder {
  private table: string;
  private url: string;
  private filters: string[] = [];
  private selectFields: string = '*';
  private orderByField: string = '';
  private orderAsc: boolean = true;
  private limitVal: number | null = null;
  private singleRow: boolean = false;
  private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
  private body: any = null;
  private filterColumn: string = '';

  constructor(table: string) {
    this.table = table;
    this.url = tableUrlMap[table] || `/${table}`;
  }

  select(fields: string = '*') {
    this.selectFields = fields;
    // Only set to GET if no other method (POST/PATCH/DELETE) has been set
    if (this.method === 'GET' || (!this.body && this.method !== 'DELETE')) {
      this.method = 'GET';
    }
    return this;
  }

  insert(data: any) {
    this.method = 'POST';
    this.body = data;
    return this;
  }

  update(data: any) {
    this.method = 'PATCH';
    this.body = data;
    return this;
  }

  delete() {
    this.method = 'DELETE';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push(`${column}=${encodeURIComponent(value)}`);
    this.filterColumn = column;
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push(`${column}_neq=${encodeURIComponent(value)}`);
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push(`${column}_gt=${encodeURIComponent(value)}`);
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push(`${column}_gte=${encodeURIComponent(value)}`);
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push(`${column}_lt=${encodeURIComponent(value)}`);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push(`${column}_lte=${encodeURIComponent(value)}`);
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push(`${column}_in=${encodeURIComponent(values.join(','))}`);
    return this;
  }

  is(column: string, value: any) {
    this.filters.push(`${column}_is=${value}`);
    return this;
  }

  not(column: string, operator: string, value: any) {
    this.filters.push(`${column}_not_${operator}=${encodeURIComponent(value)}`);
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push(`${column}_ilike=${encodeURIComponent(pattern)}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderByField = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  maybeSingle() {
    this.singleRow = true;
    return this;
  }

  async then(resolve: (value: any) => void, reject?: (err: any) => void) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err });
    }
  }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      let path = this.url;
      
      if (this.method === 'GET') {
        const params = [...this.filters];
        if (this.limitVal) params.push(`limit=${this.limitVal}`);
        if (params.length) path += '?' + params.join('&');
        
        let data: any = null;
        let vpsOk = false;
        
        try {
          const res = await apiFetch(path);
          if (res.ok) {
            data = await res.json();
            vpsOk = true;
          }
        } catch {}
        
        
        if (!vpsOk) {
          return { data: null, error: { message: 'API unavailable' } };
        }
        
        // Handle ordering client-side for now
        if (this.orderByField && Array.isArray(data)) {
          data.sort((a: any, b: any) => {
            const aVal = a[this.orderByField];
            const bVal = b[this.orderByField];
            if (aVal < bVal) return this.orderAsc ? -1 : 1;
            if (aVal > bVal) return this.orderAsc ? 1 : -1;
            return 0;
          });
        }
        
        if (this.singleRow) data = Array.isArray(data) ? data[0] || null : data;
        return { data, error: null };
      }

      if (this.method === 'POST') {
        const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(this.body) });
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error } };
        }
        const data = await res.json();
        return { data, error: null };
      }

      if (this.method === 'PATCH') {
        // Find the ID from filters
        const idFilter = this.filters.find(f => f.startsWith('id='));
        const id = idFilter ? idFilter.split('=')[1] : '';
        const res = await apiFetch(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify(this.body) });
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error } };
        }
        const data = await res.json();
        return { data, error: null };
      }

      if (this.method === 'DELETE') {
        const idFilter = this.filters.find(f => f.startsWith('id='));
        const id = idFilter ? idFilter.split('=')[1] : '';
        let deletePath: string;
        if (id) {
          // Delete by ID: DELETE /api/table/:id
          deletePath = `${path}/${id}`;
        } else if (this.filters.length) {
          // Bulk delete by filter: DELETE /api/table?filter=value
          deletePath = `${path}?${this.filters.join('&')}`;
        } else {
          return { data: null, error: { message: 'Delete requires an id or filter' } };
        }
        const res = await apiFetch(deletePath, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error } };
        }
        return { data: {}, error: null };
      }

      return { data: null, error: { message: 'Unknown method' } };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }
}

// =============================================
// Storage API
// =============================================
const storage = {
  from(bucket: string) {
    const normalizePath = (p: string) => p.replace(/^\/+/, "");
    return {
      async upload(path: string, file: File, _options?: { upsert?: boolean }) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('path', normalizePath(path));
        const token = TokenManager.getAccessToken();
        const res = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error } };
        }
        const data = await res.json();
        return { data: { path: data.file_path }, error: null };
      },

      async remove(paths: string[]) {
        const res = await apiFetch(`/storage/${bucket}`, {
          method: 'DELETE',
          body: JSON.stringify({ paths: paths.map(normalizePath) }),
        });
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error } };
        }
        return { data: {}, error: null };
      },

      async list(prefix: string = "", _options?: any) {
        const res = await apiFetch(`/storage/${bucket}/list?prefix=${encodeURIComponent(prefix)}`);
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: { message: err.error } };
        }
        const data = await res.json();
        return { data, error: null };
      },

      async download(path: string) {
        const token = TokenManager.getAccessToken();
        const res = await fetch(`${API_URL}/storage/${bucket}/download?path=${encodeURIComponent(normalizePath(path))}`, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          let message = 'Download failed';
          try {
            const err = await res.json();
            message = err.error || message;
          } catch {}
          return { data: null, error: { message } };
        }
        const blob = await res.blob();
        return { data: blob, error: null };
      },

      async createSignedUrl(path: string, _expiresIn: number) {
        return { data: { signedUrl: `${API_URL.replace('/api', '')}/uploads/${bucket}/${normalizePath(path)}` }, error: null };
      },

      getPublicUrl(path: string) {
        return { data: { publicUrl: `${API_URL.replace('/api', '')}/uploads/${bucket}/${normalizePath(path)}` } };
      },
    };
  },
};

// =============================================
// Functions API — calls VPS backend only
// =============================================
const functions = {
  async invoke(name: string, options?: { body?: any }) {
    const path = name.startsWith('auth/') ? `/${name}` : `/${name}`;
    const isFormData = options?.body instanceof FormData;
    const token = TokenManager.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers,
        body: isFormData ? options.body : (options?.body ? JSON.stringify(options.body) : undefined),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        return { data: null, error: { message: err.error || 'Request failed' } };
      }
      const data = await res.json().catch(() => ({}));
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Backend unreachable' } };
    }
  },
};

// =============================================
// Main export — self-hosted backend client
// =============================================
export const apiClient = {
  auth,
  storage,
  functions,
  from(table: string) {
    return new QueryBuilder(table);
  },
  // Realtime stub (not used in production VPS build)
  channel(_name: string) {
    return {
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}),
    };
  },
  removeChannel(_ch: any) {},
};

export type ApiClient = typeof apiClient;
