'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AqualesMeasurement } from '@/app/hooks/useAqualesMeasurements';
import {
  PERIODOS,
  PeriodoHistorico,
  useMeasurementHistory,
} from '@/app/hooks/useMeasurementHistory';
import {
  ALTURA_CAIXA_CM,
  CAPACIDADE_TOTAL_L,
  INTERVALO_MEDICAO_MIN,
  LIMIAR_NIVEL_CRITICO_PERCENT,
  calcularMedidas,
  formatarNumero,
} from '@/lib/constants';
import { IoRefresh } from 'react-icons/io5';

type Metrica = 'porcentagem' | 'volume' | 'distancia';

const METRICAS: { value: Metrica; label: string; unidade: string; max: number }[] = [
  { value: 'porcentagem', label: 'Nível (%)', unidade: '%', max: 100 },
  { value: 'volume', label: 'Volume (L)', unidade: 'L', max: CAPACIDADE_TOTAL_L },
  { value: 'distancia', label: 'Distância (cm)', unidade: 'cm', max: ALTURA_CAIXA_CM },
];

const LABELS_CURTOS: Record<PeriodoHistorico, string> = {
  '24h': '24h',
  '7d': '7 dias',
  '30d': '1 mês',
  '90d': '3 meses',
};

const MAX_PONTOS = 300; // limite de pontos desenhados (agrega por média quando há mais)
const DURACAO_TRANSICAO_MS = 550;

interface Ponto {
  t: number; // epoch ms
  v: number;
}

interface XY {
  x: number;
  y: number;
}

function parseTimestamp(ts: string): number {
  // "YYYY-MM-DD HH:mm:ss" (horário local) -> Date compatível com todos os navegadores
  return new Date(ts.replace(' ', 'T')).getTime();
}

function valorDaMetrica(l: AqualesMeasurement, m: Metrica): number {
  const med = calcularMedidas(l.water_distance_cm);
  if (m === 'porcentagem') return med.porcentagem;
  if (m === 'volume') return med.volumeL;
  return med.distanciaEfetivaCm;
}

function agregar(pontos: Ponto[], max: number): Ponto[] {
  if (pontos.length <= max) return pontos;
  const t0 = pontos[0].t;
  const t1 = pontos[pontos.length - 1].t;
  const passo = (t1 - t0) / max || 1;
  const buckets: { t: number; soma: number; n: number }[] = [];
  for (const p of pontos) {
    const i = Math.min(max - 1, Math.floor((p.t - t0) / passo));
    const b = (buckets[i] ??= { t: 0, soma: 0, n: 0 });
    b.t += p.t;
    b.soma += p.v;
    b.n++;
  }
  return buckets.filter(Boolean).map((b) => ({ t: b.t / b.n, v: b.soma / b.n }));
}

/**
 * Curva cúbica monotônica (Fritsch–Carlson): deixa a evolução orgânica e suave
 * como nível real de água, sem criar ondas artificiais acima/abaixo dos pontos medidos.
 */
function curvaMonotonica(pts: XY[]): string {
  const n = pts.length;
  if (n === 0) return '';
  const f = (v: number) => v.toFixed(1);
  if (n === 1) return `M${f(pts[0].x)},${f(pts[0].y)}`;
  if (n === 2) return `M${f(pts[0].x)},${f(pts[0].y)} L${f(pts[1].x)},${f(pts[1].y)}`;

  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = dx[i] ? (pts[i + 1].y - pts[i].y) / dx[i] : 0;
  }

  const tg: number[] = new Array(n);
  tg[0] = m[0];
  tg[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      tg[i] = 0; // extremo local: tangente horizontal evita overshoot
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tg[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
    }
  }

  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${f(pts[i].x + h)},${f(pts[i].y + h * tg[i])} ${f(pts[i + 1].x - h)},${f(
      pts[i + 1].y - h * tg[i + 1]
    )} ${f(pts[i + 1].x)},${f(pts[i + 1].y)}`;
  }
  return d;
}

/** Obtém a altura Y correspondente na curva anterior para interpolar suavemente entre períodos. */
function amostrarCurva(curva: XY[] | null, px: number, fallbackY: number): number {
  if (!curva || curva.length === 0) return fallbackY;
  if (px <= curva[0].x) return curva[0].y;
  const ult = curva[curva.length - 1];
  if (px >= ult.x) return ult.y;

  let lo = 0;
  let hi = curva.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (curva[mid].x <= px) lo = mid;
    else hi = mid;
  }
  const a = curva[lo];
  const b = curva[hi];
  const span = b.x - a.x;
  if (span <= 0) return a.y;
  return a.y + ((px - a.x) / span) * (b.y - a.y);
}

function formatarEixoX(t: number, periodo: PeriodoHistorico): string {
  const d = new Date(t);
  if (periodo === '24h') {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatarDataCompleta(t: number): string {
  return new Date(t).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Mede a largura real do container para desenhar o SVG em pixels reais (sem encolher fontes no celular). */
function useLarguraElemento<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setLargura(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setLargura(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, largura] as const;
}

interface HistoricoChartProps {
  deviceId: string | null;
  /** Leitura mais recente (vinda da subscription) para atualizar o gráfico em tempo real */
  ultimaLeitura?: AqualesMeasurement | null;
}

export function HistoricoChart({ deviceId, ultimaLeitura }: HistoricoChartProps) {
  const [periodo, setPeriodo] = useState<PeriodoHistorico>('24h');
  const [metrica, setMetrica] = useState<Metrica>('porcentagem');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [wrapRef, largura] = useLarguraElemento<HTMLDivElement>();
  const toqueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs para interpolação suave (morph) da curva ao trocar range de dias ou métrica
  const curvaRenderizadaRef = useRef<XY[] | null>(null);
  const curvaOrigemRef = useRef<XY[] | null>(null);
  const primeiraCargaRef = useRef(true);
  const [progresso, setProgresso] = useState(1);

  useEffect(
    () => () => {
      if (toqueTimer.current) clearTimeout(toqueTimer.current);
    },
    []
  );

  const { dados, versao, isLoading, error, recarregar, anexarLeitura } = useMeasurementHistory(
    deviceId ?? '',
    periodo
  );

  useEffect(() => {
    if (!isLoading) anexarLeitura(ultimaLeitura);
  }, [ultimaLeitura, isLoading, anexarLeitura]);

  // Dispara animação suave sempre que um novo range carrega (`versao`) ou a métrica muda
  useEffect(() => {
    if (versao === 0) return;
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduzir) {
      setProgresso(1);
      primeiraCargaRef.current = false;
      return;
    }

    curvaOrigemRef.current = curvaRenderizadaRef.current;
    let raf = 0;
    const inicio = performance.now();

    const tick = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / DURACAO_TRANSICAO_MS);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setProgresso(ease);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        primeiraCargaRef.current = false;
      }
    };

    setProgresso(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [versao, metrica]);

  const cfgMetrica = METRICAS.find((m) => m.value === metrica)!;
  const cfgPeriodo = PERIODOS.find((p) => p.value === periodo)!;
  const periodoIdx = PERIODOS.findIndex((p) => p.value === periodo);

  // Dimensões responsivas em pixels reais: gráfico amplo e legível no celular
  const W = Math.max(280, largura || 640);
  const isCompacto = W < 520;
  const H = isCompacto ? 265 : 340;
  const M = { top: 20, right: 12, bottom: 30, left: isCompacto ? 34 : 44 };
  const PW = W - M.left - M.right;
  const PH = H - M.top - M.bottom;

  const pontos = useMemo(() => {
    const brutos = dados
      .map((l) => ({ t: parseTimestamp(l.timestamp), v: valorDaMetrica(l, metrica) }))
      .filter((p) => !Number.isNaN(p.t));
    return agregar(brutos, MAX_PONTOS);
  }, [dados, metrica]);

  // Domínio do eixo X fixado por versão dos dados (evita oscilar durante a animação)
  const { tMin, tMax } = useMemo(() => {
    const agora = Date.now();
    return { tMin: agora - cfgPeriodo.horas * 3600 * 1000, tMax: agora };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgPeriodo.horas, versao, dados.length]);
  const yMax = cfgMetrica.max;

  const x = useCallback(
    (t: number) => M.left + ((t - tMin) / (tMax - tMin)) * PW,
    [M.left, tMin, tMax, PW]
  );
  const y = useCallback(
    (v: number) => M.top + PH - (Math.max(0, Math.min(yMax, v)) / yMax) * PH,
    [M.top, PH, yMax]
  );

  // Segmentos contínuos com morph suave entre a curva anterior e a nova curva
  const { linhas, areas, isolados, ultimoAnimado } = useMemo(() => {
    const limiteGap = Math.max(
      INTERVALO_MEDICAO_MIN * 3 * 60 * 1000,
      ((tMax - tMin) / MAX_PONTOS) * 3
    );
    const segs: Ponto[][] = [];
    let atual: Ponto[] = [];
    pontos.forEach((p, i) => {
      if (i > 0 && p.t - pontos[i - 1].t > limiteGap) {
        segs.push(atual);
        atual = [];
      }
      atual.push(p);
    });
    if (atual.length) segs.push(atual);

    const base = y(0);
    const origem = curvaOrigemRef.current;
    const linhas: string[] = [];
    const areas: string[] = [];
    const isolados: XY[] = [];
    const todosAnimados: XY[] = [];

    for (const s of segs) {
      const xy = s.map((p) => {
        const px = x(p.t);
        const pyAlvo = y(p.v);
        const pyOrigem = origem
          ? amostrarCurva(origem, px, pyAlvo)
          : Math.min(base, pyAlvo + 22);
        const py =
          progresso >= 1 ? pyAlvo : pyOrigem + (pyAlvo - pyOrigem) * progresso;
        const pt = { x: px, y: py };
        todosAnimados.push(pt);
        return pt;
      });

      if (xy.length === 1) {
        isolados.push(xy[0]);
        continue;
      }
      const d = curvaMonotonica(xy);
      linhas.push(d);
      areas.push(
        `${d} L${xy[xy.length - 1].x.toFixed(1)},${base.toFixed(1)} L${xy[0].x.toFixed(
          1
        )},${base.toFixed(1)} Z`
      );
    }

    if (todosAnimados.length > 0) {
      curvaRenderizadaRef.current = todosAnimados;
    }

    const ultimoAnimado =
      todosAnimados.length > 0 ? todosAnimados[todosAnimados.length - 1] : null;
    return { linhas, areas, isolados, ultimoAnimado };
  }, [pontos, tMin, tMax, x, y, progresso]);

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const nTicksX = isCompacto ? 4 : 6;
  const ticksX = Array.from(
    { length: nTicksX },
    (_, i) => tMin + (i / (nTicksX - 1)) * (tMax - tMin)
  );

  // Linha de nível crítico
  const linhaCritica =
    metrica === 'distancia'
      ? ALTURA_CAIXA_CM * (1 - LIMIAR_NIVEL_CRITICO_PERCENT)
      : yMax * LIMIAR_NIVEL_CRITICO_PERCENT;

  const stats = useMemo(() => {
    if (!pontos.length) return null;
    const vals = pontos.map((p) => p.v);
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      media: vals.reduce((a, b) => a + b, 0) / vals.length,
    };
  }, [pontos]);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pontos.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = tMin + ((px - M.left) / PW) * (tMax - tMin);
    let best = 0;
    for (let i = 1; i < pontos.length; i++) {
      if (Math.abs(pontos[i].t - t) < Math.abs(pontos[best].t - t)) best = i;
    }
    setHoverIdx(best);
  }

  const hover = hoverIdx !== null ? pontos[hoverIdx] : null;
  const opacidadeEntrada = primeiraCargaRef.current
    ? 0.25 + 0.75 * progresso
    : 1;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-800">
              Evolução do nível
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {isLoading && !dados.length
                ? 'Carregando leituras...'
                : `${dados.length} leituras em ${cfgPeriodo.label}${
                    dados.length > MAX_PONTOS
                      ? ` (suavizadas em ${pontos.length} pontos)`
                      : ''
                  }`}
            </p>
          </div>

          {/* Botão de recarregar compacto no topo direito no celular */}
          <button
            onClick={recarregar}
            className="sm:hidden p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 cursor-pointer disabled:opacity-40"
            disabled={isLoading}
            aria-label="Recarregar"
            title="Recarregar"
          >
            <IoRefresh className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Seletor de período com pílula deslizante animada */}
          <div
            className="relative grid grid-cols-4 rounded-xl bg-gray-100 p-1 w-full sm:w-auto"
            role="group"
            aria-label="Período"
          >
            <div
              aria-hidden="true"
              className="absolute top-1 bottom-1 left-1 rounded-lg bg-primary-blue-dark shadow-xs transition-transform duration-300 ease-out"
              style={{
                width: 'calc((100% - 0.5rem) / 4)',
                transform: `translateX(${Math.max(0, periodoIdx) * 100}%)`,
              }}
            />
            {PERIODOS.map((p) => {
              const ativo = periodo === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => {
                    setHoverIdx(null);
                    setPeriodo(p.value);
                  }}
                  className={`relative z-10 px-2 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer transition-colors duration-200 rounded-lg ${
                    ativo ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-pressed={ativo}
                >
                  <span className="sm:hidden">{LABELS_CURTOS[p.value]}</span>
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={metrica}
              onChange={(e) => {
                setHoverIdx(null);
                setMetrica(e.target.value as Metrica);
              }}
              className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Métrica"
            >
              {METRICAS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <button
              onClick={recarregar}
              className="hidden sm:inline-flex p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 cursor-pointer disabled:opacity-40 transition-colors"
              disabled={isLoading}
              aria-label="Recarregar"
              title="Recarregar"
            >
              <IoRefresh className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div ref={wrapRef} className="relative w-full overflow-hidden">
        <svg
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full select-none touch-pan-y"
          onPointerMove={onMove}
          onPointerDown={(e) => {
            if (toqueTimer.current) clearTimeout(toqueTimer.current);
            onMove(e);
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== 'mouse') {
              toqueTimer.current = setTimeout(() => setHoverIdx(null), 2500);
            }
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setHoverIdx(null);
          }}
        >
          <defs>
            <linearGradient id="hist-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#29b6f6" stopOpacity="0.36" />
              <stop offset="85%" stopColor="#29b6f6" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#29b6f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hist-linha" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#29b6f6" />
              <stop offset="50%" stopColor="#0288d1" />
              <stop offset="100%" stopColor="#0d47a1" />
            </linearGradient>
            <clipPath id="hist-plot">
              <rect x={M.left} y={M.top - 6} width={PW} height={PH + 12} />
            </clipPath>
          </defs>

          {/* Grade + eixo Y */}
          {ticksY.map((v) => (
            <g key={v}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={y(v)}
                y2={y(v)}
                stroke="#eef2f6"
                strokeDasharray={v === 0 ? undefined : '4 4'}
              />
              <text
                x={M.left - 7}
                y={y(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="#94a3b8"
              >
                {formatarNumero(v)}
              </text>
            </g>
          ))}

          {/* Eixo X */}
          {ticksX.map((t, i) => (
            <text
              key={i}
              x={x(t)}
              y={H - 8}
              textAnchor={
                i === 0 ? 'start' : i === ticksX.length - 1 ? 'end' : 'middle'
              }
              fontSize={11}
              fill="#94a3b8"
            >
              {formatarEixoX(t, periodo)}
            </text>
          ))}

          {/* Limiar crítico */}
          <line
            x1={M.left}
            x2={W - M.right}
            y1={y(linhaCritica)}
            y2={y(linhaCritica)}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeOpacity="0.5"
          />
          <text
            x={W - M.right}
            y={y(linhaCritica) - 5}
            textAnchor="end"
            fontSize="10"
            fill="#ef4444"
            fillOpacity="0.8"
          >
            nível crítico
          </text>

          {/* Série suavizada com transição orgânica */}
          <g
            clipPath="url(#hist-plot)"
            style={{
              opacity: isLoading ? 0.55 : opacidadeEntrada,
              transition: 'opacity 250ms ease',
            }}
          >
            {areas.map((d, i) => (
              <path key={`a${i}`} d={d} fill="url(#hist-area)" />
            ))}
            {linhas.map((d, i) => (
              <path
                key={`l${i}`}
                d={d}
                fill="none"
                stroke="url(#hist-linha)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {isolados.map((p, i) => (
              <circle key={`p${i}`} cx={p.x} cy={p.y} r="3.5" fill="#0d47a1" />
            ))}

            {/* Indicador vivo na leitura mais recente */}
            {ultimoAnimado && !hover && (
              <g>
                <circle
                  cx={ultimoAnimado.x}
                  cy={ultimoAnimado.y}
                  r="8"
                  fill="#29b6f6"
                  opacity="0.25"
                >
                  <animate
                    attributeName="r"
                    values="5;11;5"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.35;0;0.35"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={ultimoAnimado.x}
                  cy={ultimoAnimado.y}
                  r="4"
                  fill="#fff"
                  stroke="#0d47a1"
                  strokeWidth="2.2"
                />
              </g>
            )}
          </g>

          {hover && (
            <g pointerEvents="none">
              <line
                x1={x(hover.t)}
                x2={x(hover.t)}
                y1={M.top}
                y2={M.top + PH}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              <circle
                cx={x(hover.t)}
                cy={y(hover.v)}
                r="5"
                fill="#fff"
                stroke="#0d47a1"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {hover && (
          <div
            className="absolute pointer-events-none bg-neutral-800/95 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap"
            style={{
              left: `${(x(hover.t) / W) * 100}%`,
              top: Math.max(4, y(hover.v) - 48),
              transform:
                x(hover.t) > W / 2
                  ? 'translateX(calc(-100% - 10px))'
                  : 'translateX(10px)',
            }}
          >
            <div className="font-bold">
              {formatarNumero(hover.v)} {cfgMetrica.unidade}
            </div>
            <div className="text-gray-300">{formatarDataCompleta(hover.t)}</div>
          </div>
        )}

        {!isLoading && !error && pontos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
            Nenhuma leitura neste período.
          </div>
        )}
        {error != null && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm">
            Erro ao carregar histórico.
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 text-center">
          {[
            { label: 'Mínimo', v: stats.min },
            { label: 'Média', v: stats.media },
            { label: 'Máximo', v: stats.max },
          ].map((s) => (
            <div key={s.label} className="bg-info-blue-light/40 rounded-xl py-2.5">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="font-bold text-primary-blue-dark text-sm sm:text-base">
                {formatarNumero(s.v)} {cfgMetrica.unidade}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
