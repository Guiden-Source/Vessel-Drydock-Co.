// lib/loadSnapshotFromSupabase.ts
import { supabase } from '@/lib/supabaseClient';
import type { OperationSnapshot } from './mockSnapshot';

const ORG_ID_TESTE = '7c0a5826-6da1-472b-8e1a-9633d15492d2';

export async function loadSnapshotFromSupabase(): Promise<OperationSnapshot | null> {
  const { data: snapshotRow, error: snapshotError } = await supabase
    .from('operation_snapshots')
    .select('*')
    .eq('organization_id', ORG_ID_TESTE)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotError || !snapshotRow) {
    console.warn('[Vessel] Não foi possível carregar operation_snapshot ativo:', snapshotError?.message);
    return null;
  }

  const snapshotId = snapshotRow.id as string;

  const { data: readingItems, error: readingError } = await supabase
    .from('reading_items')
    .select('*')
    .eq('organization_id', ORG_ID_TESTE)
    .eq('snapshot_id', snapshotId)
    .order('sort_order', { ascending: true });

  if (readingError) {
    console.warn('[Vessel] Erro ao carregar reading_items:', readingError.message);
  }

  const { data: riskItems, error: riskError } = await supabase
    .from('risk_items')
    .select('*')
    .eq('organization_id', ORG_ID_TESTE)
    .eq('snapshot_id', snapshotId)
    .order('sort_order', { ascending: true });

  if (riskError) {
    console.warn('[Vessel] Erro ao carregar risk_items:', riskError.message);
  }

  const { data: actionsItems, error: actionsError } = await supabase
    .from('next_actions')
    .select('*')
    .eq('organization_id', ORG_ID_TESTE)
    .eq('snapshot_id', snapshotId)
    .order('sort_order', { ascending: true });

  if (actionsError) {
    console.warn('[Vessel] Erro ao carregar next_actions:', actionsError.message);
  }

  const { data: backlogItems, error: backlogError } = await supabase
    .from('backlog_items')
    .select('*')
    .eq('organization_id', ORG_ID_TESTE)
    .eq('snapshot_id', snapshotId)
    .order('sort_order', { ascending: true });

  if (backlogError) {
    console.warn('[Vessel] Erro ao carregar backlog_items:', backlogError.message);
  }

  const { data: indicatorsRows, error: indicatorsError } = await supabase
    .from('key_indicators')
    .select('*')
    .eq('organization_id', ORG_ID_TESTE)
    .eq('snapshot_id', snapshotId)
    .order('sort_order', { ascending: true });

  if (indicatorsError) {
    console.warn('[Vessel] Erro ao carregar key_indicators:', indicatorsError.message);
  }

  const statusScore = snapshotRow.score_value as number;
  const statusLabel = snapshotRow.status_label as string;
  const statusNote = snapshotRow.summary_text as string;

  const statusTrendData = [
    { value: Math.max(0, statusScore - 20) },
    { value: Math.max(0, statusScore - 10) },
    { value: statusScore },
  ];

  const drydockSummary = snapshotRow.summary_text as string;

  const drydockChecklist = (readingItems || []).map((item: any) => {
    let statusType: 'success' | 'warning' | 'pending' = 'pending';

    if (item.status === 'concluido') statusType = 'success';
    else if (item.status === 'em_andamento') statusType = 'warning';
    else statusType = 'pending';

    return {
      id: item.id as string,
      label: item.title as string,
      statusText:
        item.status === 'em_andamento'
          ? `Em andamento, ${Math.round((item.progress || 0) * 100)}%`
          : item.status.charAt(0).toUpperCase() + item.status.slice(1),
      statusType,
    };
  });

  const risks = (riskItems || []).map((item: any) => {
    let level: 'Alto' | 'Médio' | 'Baixo' = 'Baixo';
    if (item.severity === 'alto') level = 'Alto';
    else if (item.severity === 'medio') level = 'Médio';

    return {
      id: item.id as string,
      text: item.title as string,
      level,
    };
  });

  const actions = (actionsItems || []).map((item: any) => ({
    id: item.id as string,
    title: item.text as string,
  }));

  const backlog = (backlogItems || []).map((item: any) => {
    let statusTheme: 'success' | 'light' | 'dark' = 'dark';

    if (item.status === 'concluido') statusTheme = 'success';
    else if (item.status === 'pendente') statusTheme = 'light';
    else statusTheme = 'dark';

    return {
      id: item.id as string,
      title: item.title as string,
      subtitle: item.context as string,
      statusText:
        item.status === 'concluido'
          ? 'Concluído'
          : item.status === 'pendente'
          ? 'Pendente'
          : 'Em Progresso',
      statusTheme,
    };
  });

  function findIndicator(title: string) {
    return (indicatorsRows || []).find((i: any) => i.title === title);
  }

  const trafficRow = findIndicator('Tráfego Site');
  const socialRow = findIndicator('Social');
  const roiRow = findIndicator('ROI Marketing');
  const healthRow = findIndicator('Saúde Digital');

  const indicators = {
    traffic: {
      value: trafficRow?.value_text || '+12%',
      tag: trafficRow?.trend_text || '+12%',
      tagType: 'positive' as const,
      trendData: [{ value: 50 }, { value: 60 }, { value: 55 }, { value: 70 }, { value: 85 }, { value: 75 }, { value: 92 }],
    },
    social: {
      value: socialRow?.value_text || 'Estável',
      tag: null,
      tagType: 'neutral' as const,
      trendData: [{ value: 70 }, { value: 72 }, { value: 71 }, { value: 75 }, { value: 74 }, { value: 76 }, { value: 75 }],
    },
    roi: {
      value: roiRow?.value_text || '4.5x',
      tag: roiRow?.trend_text || '+11%',
      tagType: 'positive' as const,
      trendData: [{ value: 2.1 }, { value: 2.3 }, { value: 2.8 }, { value: 3.2 }, { value: 3.8 }, { value: 4.1 }, { value: 4.5 }],
    },
    health: {
      value: healthRow?.value_text?.split('/')?.[0] || '92',
      suffix: '/100',
      tag: null,
      tagType: 'neutral' as const,
      trendData: [{ value: 88 }, { value: 89 }, { value: 87 }, { value: 90 }, { value: 91 }, { value: 91 }, { value: 92 }],
    },
  };

  const result: OperationSnapshot = {
    status: {
      score: statusScore,
      label: statusLabel,
      note: statusNote,
      trendData: statusTrendData,
    },
    drydockReading: {
      summary: drydockSummary,
      checklist: drydockChecklist,
    },
    risks,
    actions,
    backlog,
    indicators,
  };

  console.log('[Vessel] Snapshot carregado do Supabase', result);

  return result;
}
