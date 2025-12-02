import { api } from '../api';

export const getUserById = async (userId: string) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
};

export const updateUser = async (id: string, userData: any) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

export const deleteUser = async (userId: string) => {
    await api.delete(`/users/${userId}`);
};

