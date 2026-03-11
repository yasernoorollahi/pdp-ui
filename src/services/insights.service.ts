import api from '../api/axios';

export type TimelinePoint = {
  date: string;
  energy: number;
  motivation: number;
  friction: number;
  social: number;
  discipline: number;
};

export type MindSnapshot = {
  energy: number;
  motivation: number;
  friction: number;
  social: number;
  discipline: number;
};

export type FrictionPoint = {
  date: string;
  value: number;
};

export type MoodWord = {
  word: string;
  count: number;
};

export type InsightSummary = {
  energy: string;
  motivation: string;
  friction: string;
  social: string;
  discipline: string;
};

export type TrendPoint = {
  date: string;
  value: number;
};

export type EnergyTrend = {
  averageEnergy: number;
  trend: TrendPoint[];
};

export type MotivationTrend = {
  averageMotivation: number;
  trend: TrendPoint[];
};

export type SocialTrend = {
  total: number;
  trend: TrendPoint[];
};

export type DisciplineTrend = {
  total: number;
  trend: TrendPoint[];
};

export const insightsService = {
  async getTimeline(days = 15): Promise<TimelinePoint[]> {
    const response = await api.get('/insights/timeline', {
      params: { days },
    });
    return response.data;
  },

  async getTodaySnapshot(): Promise<MindSnapshot> {
    const response = await api.get('/insights/today');
    return response.data;
  },

  async getFrictionHeatmap(): Promise<FrictionPoint[]> {
    const response = await api.get('/insights/friction');
    return response.data;
  },

  async getMoods(): Promise<MoodWord[]> {
    const response = await api.get('/insights/moods');
    return response.data;
  },

  async getSummary(): Promise<InsightSummary> {
    const response = await api.get('/insights/summary');
    return response.data;
  },

  async getEnergy(): Promise<EnergyTrend> {
    const response = await api.get('/insights/energy');
    return response.data;
  },

  async getMotivation(): Promise<MotivationTrend> {
    const response = await api.get('/insights/motivation');
    return response.data;
  },

  async getSocial(): Promise<SocialTrend> {
    const response = await api.get('/insights/social');
    return response.data;
  },

  async getDiscipline(): Promise<DisciplineTrend> {
    const response = await api.get('/insights/discipline');
    return response.data;
  },
};
