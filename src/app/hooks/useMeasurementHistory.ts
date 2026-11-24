'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { client } from '@/lib/amplifyClient';
import type { AqualesMeasurement } from './useAqualesMeasurements';

export type PeriodoHistorico = '24h' | '7d' | '30d' | '90d';

export const PERIODOS: { value: PeriodoHistorico; label: string; horas: number }[] = [
  { value: '24h', label: '24 horas', horas: 24 },
  { value: '7d', label: '7 dias', horas: 24 * 7 },
  { value: '30d', label: '1 mês', horas: 24 * 30 },
  { value: '90d', label: '3 meses', horas: 24 * 90 },
];

/**
 * Query otimizada (DynamoDB Query por partition key + range na sort key).
 * Precisa ser criada no AppSync — veja instruções no README/resposta.
 */
const QUERY_BY_RANGE = /* GraphQL */ `
  query QueryByRange($id: String!, $from: String!, $to: String!, $limit: Int, $nextToken: String) {
    queryAqualesMeasurementsByRange(id: $id, from: $from, to: $to, limit: $limit, nextToken: $nextToken) {
      items {
        id
        timestamp
        water_distance_cm
      }
      nextToken
    }
  }
`;

/**
 * Fallback: listAqualesMeasurements com filtro (Scan + FilterExpression no DynamoDB).
 * Só trafega os itens do período, mas ainda varre a tabela inteira no lado da AWS.
 */
const LIST_WITH_FILTER = /* GraphQL */ `
  query ListByRange($filter: TableAqualesMeasurementsFilterInput, $limit: Int, $nextToken: String) {
    listAqualesMeasurements(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        timestamp
        water_distance_cm
      }
      nextToken
    }
  }
`;

// As leituras são salvas no DynamoDB em horário local no formato "YYYY-MM-DD HH:mm:ss"
function formatarTimestampLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}`;
}

type Connection = {
  items?: Array<AqualesMeasurement | null>;
  nextToken?: string | null;
};

function isCampoInexistente(err: unknown): boolean {
  const errors = (err as { errors?: Array<{ message?: string; errorType?: string }> })?.errors;
  return (
    Array.isArray(errors) &&
    errors.some(
      (e) =>
        e?.errorType === 'FieldUndefined' ||
        /queryAqualesMeasurementsByRange/.test(e?.message ?? '')
    )
  );
}

// Cache em memória por sessão para não refazer a mesma consulta ao alternar períodos
const cache = new Map<string, { at: number; data: AqualesMeasurement[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
// Lembra se a query otimizada existe no AppSync (evita tentar e falhar a cada troca)
let queryOtimizadaDisponivel: boolean | null = null;

export function useMeasurementHistory(deviceId: string, periodo: PeriodoHistorico) {
  const [dados, setDados] = useState<AqualesMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Incrementa sempre que um novo conjunto de dados é carregado (não muda em leituras em tempo real).
  // Usado pelo gráfico para disparar a animação de entrada.
  const [versao, setVersao] = useState(0);
  const reqId = useRef(0);

  const recarregar = useCallback(() => {
    cache.delete(`${deviceId}:${periodo}`);
    setReloadKey((k) => k + 1);
  }, [deviceId, periodo]);

  useEffect(() => {
    if (!deviceId) return;
    const cfg = PERIODOS.find((p) => p.value === periodo) ?? PERIODOS[0];
    const cacheKey = `${deviceId}:${periodo}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      reqId.current++; // invalida qualquer requisição anterior ainda em andamento
      setDados(cached.data);
      setVersao((v) => v + 1);
      setIsLoading(false);
      setError(null);
      return;
    }

    const myReq = ++reqId.current;
    const agora = new Date();
    const from = formatarTimestampLocal(new Date(agora.getTime() - cfg.horas * 3600 * 1000));
    const to = formatarTimestampLocal(agora);

    async function paginar(
      query: string,
      vars: Record<string, unknown>,
      campo: 'queryAqualesMeasurementsByRange' | 'listAqualesMeasurements'
    ) {
      const out: AqualesMeasurement[] = [];
      let nextToken: string | null = null;
      do {
        const res = (await client.graphql({
          query,
          variables: { ...vars, nextToken },
        })) as { data?: Record<string, Connection | undefined> };
        const conn = res.data?.[campo];
        for (const it of conn?.items ?? []) if (it) out.push(it);
        nextToken = conn?.nextToken ?? null;
      } while (nextToken && myReq === reqId.current);
      return out;
    }

    async function carregar() {
      setIsLoading(true);
      setError(null);
      try {
        let itens: AqualesMeasurement[] | null = null;

        if (queryOtimizadaDisponivel !== false) {
          try {
            itens = await paginar(
              QUERY_BY_RANGE,
              { id: deviceId, from, to, limit: 1000 },
              'queryAqualesMeasurementsByRange'
            );
            queryOtimizadaDisponivel = true;
          } catch (err) {
            if (!isCampoInexistente(err)) throw err;
            queryOtimizadaDisponivel = false;
            console.info(
              '[Histórico] queryAqualesMeasurementsByRange não existe no AppSync. Usando fallback com Scan filtrado.'
            );
          }
        }

        if (itens === null) {
          itens = await paginar(
            LIST_WITH_FILTER,
            { filter: { id: { eq: deviceId }, timestamp: { between: [from, to] } } },
            'listAqualesMeasurements'
          );
        }

        if (myReq !== reqId.current) return;
        itens.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        cache.set(cacheKey, { at: Date.now(), data: itens });
        setDados(itens);
        setVersao((v) => v + 1);
      } catch (err) {
        if (myReq !== reqId.current) return;
        console.warn('Erro ao carregar histórico:', err);
        setError(err);
      } finally {
        if (myReq === reqId.current) setIsLoading(false);
      }
    }

    carregar();
  }, [deviceId, periodo, reloadKey]);

  // Permite anexar leituras em tempo real (subscription) sem refazer a consulta
  const anexarLeitura = useCallback(
    (l: AqualesMeasurement | null | undefined) => {
      if (!l || l.id !== deviceId) return;
      setDados((prev) => {
        if (prev.length && prev[prev.length - 1].timestamp >= l.timestamp) return prev;
        const next = [...prev, l];
        cache.set(`${deviceId}:${periodo}`, { at: Date.now(), data: next });
        return next;
      });
    },
    [deviceId, periodo]
  );

  return { dados, versao, isLoading, error, recarregar, anexarLeitura };
}
