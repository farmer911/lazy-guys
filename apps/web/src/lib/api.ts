import axios from 'axios';

export interface Profile {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  location: string | null;
  email: string;
  github_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  avatar_url: string | null;
  achievements: string[];
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  summary: string;
  highlights: string[];
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  summary: string;
  role: string | null;
  highlights: string[];
  tech_tags: string[];
  repo_url: string | null;
  live_url: string | null;
  featured: boolean;
}

export interface TechStack {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  years_exp: number;
}

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
  sendContact: async (payload: { name: string; email: string; message: string }) => {
    const { data } = await apiClient.post<{ ok: boolean; receivedAt: string }>('/contact', payload);
    return data;
  },
};
