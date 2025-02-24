import { http, ApiResponse } from '@qrent/shared';

interface ExternalApiData {
  id: string;
  data: any;
}

export const fetchExternalApi = async (): Promise<ApiResponse<ExternalApiData>> => {
  try {
    return await http.get('https://api.external-service08123.com/data');
  } catch (error) {
    console.error('Error fetching external API:');
    throw error;
  }
}; 