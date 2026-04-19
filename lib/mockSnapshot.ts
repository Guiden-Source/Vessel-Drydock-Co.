// Define the ideal data structure we eventually want from Supabase

export type StatusType = 'success' | 'warning' | 'pending';
export type BacklogTheme = 'success' | 'light' | 'dark';
export type RiskLevel = 'Alto' | 'Médio' | 'Baixo';

export interface OperationSnapshot {
  status: {
    score: number;
    label: string;
    note: string;
    trendData: { value: number }[];
  };
  drydockReading: {
    summary: string;
    checklist: Array<{
      id: string;
      label: string;
      statusText: string;
      statusType: StatusType;
    }>;
  };
  risks: Array<{
    id: string;
    text: string;
    level: RiskLevel;
  }>;
  actions: Array<{
    id: string;
    title: string;
  }>;
  backlog: Array<{
    id: string;
    title: string;
    subtitle: string;
    statusText: string;
    statusTheme: BacklogTheme;
  }>;
  indicators: {
    traffic: IndicatorMetrics;
    social: IndicatorMetrics;
    roi: IndicatorMetrics;
    health: IndicatorMetrics;
  };
}

export interface IndicatorMetrics {
  value: string;
  suffix?: string;
  tag: string | null;
  tagType: 'positive' | 'neutral' | 'negative';
  trendData: { value: number }[];
}

export const mockSnapshot: OperationSnapshot = {
  status: {
    score: 85,
    label: 'Em rota',
    note: 'Manutenção avançada em curso',
    trendData: [
      { value: 65 }, { value: 72 }, { value: 68 }, { value: 74 }, { value: 80 }, { value: 78 }, { value: 82 }, { value: 85 }
    ]
  },
  drydockReading: {
    summary: "Diagnóstico: A operação digital está estável, com manutenção preventiva em curso. Otimizações principais em fase final.",
    checklist: [
      { id: 'chk-1', label: 'Revisão de Tracking & UTMs', statusText: 'Concluído', statusType: 'success' },
      { id: 'chk-2', label: 'CRO: Landing Page Beta', statusText: 'Em andamento, 75%', statusType: 'warning' },
      { id: 'chk-3', label: 'Auditoria de Conteúdo SEO', statusText: 'Agendado', statusType: 'pending' },
    ]
  },
  risks: [
    { id: 'rsk-1', text: 'Declínio temporário em tráfego orgânico', level: 'Médio' },
    { id: 'rsk-2', text: 'Fadiga criativa na Campanha Q3', level: 'Baixo' },
    { id: 'rsk-3', text: 'Desatualização da tag principal de conversão', level: 'Baixo' },
  ],
  actions: [
    { id: 'act-1', title: 'Aprovar Relatório Tático de SEO' },
    { id: 'act-2', title: 'Iniciar Campanha "Novo Horizonte"' },
    { id: 'act-3', title: 'Calibrar Ferramentas de Análise' }
  ],
  backlog: [
    { id: 'tsk-1', title: 'Inspeção de Funil', subtitle: 'Fluxo B2B', statusText: 'Em Progresso', statusTheme: 'dark' },
    { id: 'tsk-2', title: 'Atualização de Conteúdo', subtitle: 'Mapeamento', statusText: 'Pendente', statusTheme: 'light' },
    { id: 'tsk-3', title: 'Análise de Feedback', subtitle: 'Sprint Passada', statusText: 'Concluído', statusTheme: 'success' },
    { id: 'tsk-4', title: 'Planejamento Q3', subtitle: 'Mesa Tática', statusText: 'Em Progresso', statusTheme: 'dark' },
  ],
  indicators: {
    traffic: {
      value: '+12%', tag: '↑ 12%', tagType: 'positive',
      trendData: [{ value: 50 }, { value: 60 }, { value: 55 }, { value: 70 }, { value: 85 }, { value: 75 }, { value: 92 }]
    },
    social: {
      value: 'Estável', tag: null, tagType: 'neutral',
      trendData: [{ value: 70 }, { value: 72 }, { value: 71 }, { value: 75 }, { value: 74 }, { value: 76 }, { value: 75 }]
    },
    roi: {
      value: '4.5x', tag: '↑ 11%', tagType: 'positive',
      trendData: [{ value: 2.1 }, { value: 2.3 }, { value: 2.8 }, { value: 3.2 }, { value: 3.8 }, { value: 4.1 }, { value: 4.5 }]
    },
    health: {
      value: '92', suffix: '/100', tag: null, tagType: 'neutral',
      trendData: [{ value: 88 }, { value: 89 }, { value: 87 }, { value: 90 }, { value: 91 }, { value: 91 }, { value: 92 }]
    }
  }
};
