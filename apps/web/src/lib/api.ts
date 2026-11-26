import axios from 'axios';
import type {
  ContactSubmissionAck,
  ContactSubmissionInput,
  Experience,
  Profile,
  Project,
  ProjectSummary,
  TechStack,
} from '@contracts/portfolio';

export type {
  ContactSubmissionAck,
  ContactSubmissionInput,
  Experience,
  Profile,
  Project,
  ProjectSummary,
  TechStack,
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 8000,
});

export const portfolioApi = {
  getProfile: async (): Promise<Profile> => {
    const { data } = await apiClient.get<Profile>('/profile');
    return data;
  },
  getExperiences: async (): Promise<Experience[]> => {
    const { data } = await apiClient.get<Experience[]>('/experiences');
    return data;
  },
  getProjects: async (): Promise<Project[]> => {
    const { data } = await apiClient.get<Project[]>('/projects');
    return data;
  },
  getTechStacks: async (): Promise<TechStack[]> => {
    const { data } = await apiClient.get<TechStack[]>('/tech-stacks');
    return data;
  },
  sendContact: async (payload: ContactSubmissionInput): Promise<ContactSubmissionAck> => {
    const { data } = await apiClient.post<ContactSubmissionAck>('/contact', payload);
    return data;
  },
};
