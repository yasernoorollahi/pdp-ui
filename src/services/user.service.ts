import api from '../api/axios';

export interface User {
  id: string;
  email: string;
  role: string[];
  locked: boolean;
  enabled: boolean;
  joinedAt: string;
  lastLogin?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const userService = {
  getAllUsers: async (page = 0, size = 20): Promise<PageResponse<User>> => {
    const response = await api.get('/users', { params: { page, size } });
    return response.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },

  setUserEnabled: async (id: string, enabled: boolean): Promise<void> => {
    await api.patch(`/users/${id}/enabled`, null, { params: { enabled } });
  },

  unlockUser: async (id: string): Promise<void> => {
    await api.post(`/users/${id}/unlock`);
  },
};
