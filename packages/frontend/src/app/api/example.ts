import { http, type ApiResponse } from '@qrent/shared';

interface User {
  id: number;
  name: string;
}

export const getUser = async (id: number): Promise<ApiResponse<User>> => {
  return http.get(`/api/users/${id}`);
}; 