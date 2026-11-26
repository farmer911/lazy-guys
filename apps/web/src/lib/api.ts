import axios from 'axios';
import type { ApiSuccessResponse } from '@contracts/common';
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
  getProjectBySlug: async (slug: string): Promise<Project> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Project>>(
      `/projects/${encodeURIComponent(slug)}`
    );
    return data.data;
  },
  getTechStacks: async (): Promise<TechStack[]> => {
    const { data } = await apiClient.get<TechStack[]>('/tech-stacks');
    return data;
  },
  sendContact: async (payload: ContactSubmissionInput): Promise<ContactSubmissionAck> => {
    const { data } = await apiClient.post<ContactSubmissionAck>('/contact', payload);
    return data;
  },
  getCvPdfUrl: (): string => `${API_BASE_URL}/cv/pdf`,
  recordVisit: async (path: string): Promise<void> => {
    await apiClient
      .post('/analytics/visit', {
        path,
        referrer: typeof document !== 'undefined' && document.referrer ? document.referrer : undefined,
      })
      .catch(() => undefined);
  },
};
