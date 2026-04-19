'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  CircleDashed, 
  Clock, 
  TrendingUp, 
  Anchor, 
  Activity,
  ListTodo,
  FileCheck,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

// Common Card Component
const GlassCard = ({ 
  children, 
  title, 
  className,
  icon: Icon
}: { 
  children: React.ReactNode; 
  title: string; 
  className?: string;
  icon?: any;
}) => {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
      }}
      className={`bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl p-6 md:p-8 flex flex-col relative overflow-hidden ${className || ''}`}
    >
      {/* Subtle top glare */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
      
      <div className="flex items-center space-x-3 mb-6">
        {Icon && <Icon className="w-[18px] h-[18px] text-slate-400" strokeWidth={2} />}
        <h3 className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500 mt-0.5">{title}</h3>
      </div>
      <div className="flex-1 flex flex-col relative z-10 w-full">
        {children}
      </div>
    </motion.div>
  );
};

// Simple Sparkline Component
const Sparkline = ({ 
  data, 
  color = "#64748B",
  fill = "#F1F5F9"
}: { 
  data: any[], 
  color?: string,
  fill?: string
}) => {
  return (
    <div className="h-10 w-full mt-auto">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`color-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#color-${color})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main Dashboard Page
import { mockSnapshot, OperationSnapshot } from '@/lib/mockSnapshot';
import { loadSnapshotFromSupabase } from '@/lib/loadSnapshotFromSupabase';

export default function VesselDashboard() {
  const [snapshot, setSnapshot] = React.useState<OperationSnapshot>(mockSnapshot);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const snapshotFromDb = await loadSnapshotFromSupabase();

        if (snapshotFromDb) {
          setSnapshot(snapshotFromDb);
        } else {
          console.info('[Vessel] Usando mockSnapshot (nenhum snapshot encontrado ou erro ao carregar do Supabase).');
        }
      } catch (err) {
        console.error('[Vessel] Exceção ao carregar dados do Supabase:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-100 font-sans text-slate-500">
        <Anchor className="w-8 h-8 opacity-50 animate-bounce mb-4" />
        <p className="uppercase tracking-[0.2em] text-xs font-semibold">Inicializando Painel Vessel...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full relative flex flex-col bg-slate-100/50 font-sans text-slate-900 overflow-x-hidden selection:bg-slate-200">
      
      {/* Background Centerpiece: 3D Ship in Drydock (Conceptual via curated image & overlays) */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-slate-200">
        <Image
          src="https://picsum.photos/seed/drydock-minimal/1920/1080?blur=1"
          alt="Drydock Centerpiece"
          fill
          className="object-cover opacity-60 mix-blend-multiply"
          referrerPolicy="no-referrer"
          priority
        />
        {/* Soft elegant gradient overlays to ensure UI legibility and luxury calm feel */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/90 via-transparent to-slate-100/90" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F8FAFC]/40 to-[#F8FAFC]/95" />
        <div className="absolute inset-x-0 bottom-0 h-[60vh] bg-gradient-to-t from-slate-100 via-slate-100/80 to-transparent" />
      </div>

      <motion.div 
        className="relative z-10 flex-col flex min-h-screen p-6 md:p-8 max-w-[1920px] mx-auto w-full"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        
        {/* Top Branding Header */}
        <motion.header 
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 1 } } }}
          className="flex flex-col mb-10 w-full"
        >
          <div className="inline-flex items-center space-x-3 text-slate-500 mb-1">
            <Anchor className="w-4 h-4 opacity-70" />
            <span className="text-xs uppercase tracking-[0.2em] font-medium">Drydock & Co.</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-[-0.03em] text-slate-900 font-medium">
            Vessel
          </h1>
        </motion.header>

        {/* Dashboard Grid Composition */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative pb-8">
          
          {/* LEFT COLUMN */}
          <div className="col-span-1 lg:col-span-3 flex flex-col space-y-6">
            
            <GlassCard title="Estado da Operação" icon={Activity} className="h-48">
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-light tracking-tight text-slate-900">{snapshot.status.score}</span>
                <span className="text-base font-medium text-slate-500">/100</span>
                <span className="text-sm font-medium tracking-wide text-emerald-700 ml-2 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{snapshot.status.label}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse block" />
                {snapshot.status.note}
              </p>
              <div className="-mx-4 -mb-4 mt-auto">
                <Sparkline data={snapshot.status.trendData} color="#3B82F6" />
              </div>
            </GlassCard>

            <GlassCard title="Leitura da Drydock" icon={FileCheck} className="flex-1">
              <h4 className="text-[0.65rem] uppercase tracking-widest text-slate-400 font-semibold mb-2">Executive Summary</h4>
              <p className="text-sm/relaxed text-slate-700 mb-6 font-medium">
                {snapshot.drydockReading.summary}
              </p>
              
              <div className="space-y-4 mb-2">
                {snapshot.drydockReading.checklist.map((item) => (
                  <div key={item.id} className="flex items-start">
                    {item.statusType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 mr-3 shrink-0" />}
                    {item.statusType === 'warning' && <Activity className="w-4 h-4 text-amber-500 mt-0.5 mr-3 shrink-0" />}
                    {item.statusType === 'pending' && <Clock className="w-4 h-4 text-slate-400 mt-0.5 mr-3 shrink-0" />}
                    <div>
                      <p className="text-sm text-slate-800">{item.label}</p>
                      <p className={`text-xs mt-0.5 ${item.statusType === 'warning' ? 'text-amber-600' : 'text-slate-500'}`}>{item.statusText}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
            
          </div>

          {/* CENTER GAP for Ship Centerpiece Visibility */}
          <div className="hidden lg:flex lg:col-span-5 pointer-events-none" />

          {/* RIGHT COLUMN */}
          <div className="col-span-1 lg:col-span-4 flex flex-col space-y-6">
            
            <GlassCard title="Riscos Ativos" icon={ShieldAlert}>
              <div className="space-y-4">
                {snapshot.risks.map((risk) => {
                  const riskStyles = risk.level === 'Médio' 
                    ? { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' }
                    : { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' };

                  return (
                    <div key={risk.id} className="flex p-3 rounded-2xl bg-white/40 border border-white/60 shadow-sm items-center hover:bg-white/60 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-4 border ${riskStyles.bg} ${riskStyles.border}`}>
                        <AlertTriangle className={`w-3.5 h-3.5 ${riskStyles.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-800 font-medium leading-tight">{risk.text}</p>
                      </div>
                      <span className={`text-[0.65rem] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/80 border border-white ml-2 ${riskStyles.color}`}>
                        {risk.level}
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard title="Próximas Ações" icon={ListTodo}>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Recomendações Prioritárias</p>
              <div className="space-y-3">
                {snapshot.actions.map((action, i) => (
                  <div key={action.id} className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 text-white cursor-pointer hover:bg-slate-800 transition-all shadow-md">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono text-slate-400">{i + 1}.</span>
                      <span className="text-sm font-medium">{action.title}</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                ))}
              </div>
            </GlassCard>

          </div>

          {/* BOTTOM ROW (Spans full width minus gaps, fits functionally below the columns and centerpiece) */}
          <div className="col-span-1 lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
            
            {/* Backlog */}
            <GlassCard title="Backlog da Operação" className="col-span-1 lg:col-span-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
                {snapshot.backlog.map((task) => {
                  let themeClasses = { cardBg: 'bg-white/50 border-white/60', badgeBg: 'bg-slate-800 text-white' };
                  if (task.statusTheme === 'light') {
                    themeClasses = { cardBg: 'bg-white/30 border-white/60 opacity-80 hover:opacity-100 transition-opacity', badgeBg: 'bg-slate-200/80 text-slate-600' };
                  } else if (task.statusTheme === 'success') {
                    themeClasses = { cardBg: 'bg-emerald-50/50 border-emerald-100', badgeBg: 'bg-emerald-100/80 text-emerald-700' };
                  }

                  return (
                    <div key={task.id} className={`p-4 rounded-2xl border flex flex-col justify-between ${themeClasses.cardBg}`}>
                      <div>
                        <h5 className="text-sm font-semibold text-slate-800 mb-1">{task.title}</h5>
                        <p className="text-xs text-slate-500">{task.subtitle}</p>
                      </div>
                      <div className="mt-4 flex items-center">
                        <span className={`px-2 py-1 text-[0.65rem] font-bold tracking-widest uppercase rounded ml-auto ${themeClasses.badgeBg}`}>
                          {task.statusText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Metrics Grid */}
            <GlassCard title="Indicadores-Chave" icon={TrendingUp} className="col-span-1 lg:col-span-4">
              <div className="grid grid-cols-2 gap-3 h-full">
                
                {/* Metric 1 - Traffic */}
                <div className="bg-white/40 border border-white/60 rounded-[1.2rem] p-4 flex flex-col justify-between overflow-hidden relative">
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Tráfego Site</span>
                    {snapshot.indicators.traffic.tag && (
                      <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-100 border border-emerald-200">{snapshot.indicators.traffic.tag}</span>
                    )}
                  </div>
                  <div className="text-xl font-medium text-slate-900 relative z-10 mb-2">{snapshot.indicators.traffic.value}</div>
                  <div className="absolute -bottom-2 -left-2 -right-2 h-10 opacity-70">
                    <Sparkline data={snapshot.indicators.traffic.trendData} color="#10b981" fill="#ecfdf5" />
                  </div>
                </div>

                {/* Metric 2 - Social */}
                <div className="bg-white/40 border border-white/60 rounded-[1.2rem] p-4 flex flex-col justify-between overflow-hidden relative">
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Social</span>
                  </div>
                  <div className="text-xl font-medium text-slate-900 relative z-10 mb-2">{snapshot.indicators.social.value}</div>
                  <div className="absolute -bottom-2 -left-2 -right-2 h-10 opacity-70">
                    <Sparkline data={snapshot.indicators.social.trendData} color="#64748b" fill="#f8fafc" />
                  </div>
                </div>

                {/* Metric 3 - ROI */}
                <div className="bg-white/40 border border-white/60 rounded-[1.2rem] p-4 flex flex-col justify-between overflow-hidden relative">
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">ROI Marketing</span>
                    {snapshot.indicators.roi.tag && (
                      <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-100 border border-emerald-200">{snapshot.indicators.roi.tag}</span>
                    )}
                  </div>
                  <div className="text-xl font-medium text-slate-900 relative z-10 mb-2">{snapshot.indicators.roi.value}</div>
                  <div className="absolute -bottom-2 -left-2 -right-2 h-10 opacity-70">
                    <Sparkline data={snapshot.indicators.roi.trendData} color="#6366f1" fill="#eef2ff" />
                  </div>
                </div>

                {/* Metric 4 - Health */}
                <div className="bg-white/40 border border-white/60 rounded-[1.2rem] p-4 flex flex-col justify-between overflow-hidden relative">
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Saúde Digital</span>
                  </div>
                  <div className="text-xl font-medium text-slate-900 relative z-10 mb-2">
                    {snapshot.indicators.health.value}
                    {snapshot.indicators.health.suffix && <span className="text-sm text-slate-500">{snapshot.indicators.health.suffix}</span>}
                  </div>
                  <div className="absolute -bottom-2 -left-2 -right-2 h-10 opacity-70">
                    <Sparkline data={snapshot.indicators.health.trendData} color="#8b5cf6" fill="#f5f3ff" />
                  </div>
                </div>

              </div>
            </GlassCard>

          </div>
        </div>
      </motion.div>
    </main>
  );
}
