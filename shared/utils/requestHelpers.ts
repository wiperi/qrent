import axios, { AxiosError } from 'axios';
import { User } from '@prisma/client';

const http = axios.create({
  baseURL: process.env.BACKEND_URL || 'http://localhost:3200',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 统一处理错误
function handleRequestError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;

    if (axiosError.response) {
      console.log(axiosError.response.data);
      // 服务器返回错误
      const status = axiosError.response.status;
      const message = axiosError.response.data?.error || '服务器错误';

      console.error(`[API Error ${status}] ${message}`);
      throw new Error(message);
    }

    if (axiosError.code === 'ECONNABORTED') {
      console.error('[API Timeout] 请求超时');
      throw new Error('请求超时');
    }

    if (axiosError.code === 'ERR_NETWORK') {
      console.error('[Network Error] 网络连接失败');
      throw new Error('网络连接失败');
    }

    console.error('[Unknown API Error]', axiosError.message);
    throw new Error(axiosError.message);
  }

  // 非 Axios 错误
  console.error('[System Error]', error);
  throw error;
}

// 响应拦截器
http.interceptors.response.use(
  response => response.data,
  error => handleRequestError(error)
);

function hello(): Promise<Record<string, string>> {
  return http.get('/hello');
}

function register(
  data: { email: string; password: string } & Partial<Omit<User, 'email' | 'password'>>
): Promise<{ token: string }> {
  return http.post('/auth/register', data);
}

function login(data: Pick<User, 'email' | 'password'>): Promise<{ token: string }> {
  return http.post('/auth/login', data);
}

function clear() {
  return http.get('/clear');
}

export { hello, register, login, clear };
