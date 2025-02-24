import axios from 'axios';
import prisma from './prisma';

export const http = axios.create({
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 响应拦截器
http.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

console.log('shared');

export type ApiResponse<T = any> = {
  code: number;
  data: T;
  message: string;
};

export { prisma };
export default http; 