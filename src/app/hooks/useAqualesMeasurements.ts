'use client';

import { useEffect, useState, useCallback } from 'react';
import { client } from '@/lib/amplifyClient';

export interface AqualesMeasurement {
  id: string;
  timestamp: string;
  water_distance_cm: number;
}

// Mapa de leituras: id do dispositivo -> leitura mais recente
export type LeiturasMap = Record<string, AqualesMeasurement>;

const LIST_MEASUREMENTS_QUERY = /* GraphQL */ `
  query ListMeasurements(
    $filter: TableAqualesMeasurementsFilterInput
    $limit: Int
    $nextToken: String
  ) {
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

const SUBSCRIPTION_QUERY = /* GraphQL */ `
  subscription OnCreateMeasurement($id: String!) {
    onCreateAqualesMeasurements(id: $id) {
      id
      timestamp
      water_distance_cm
    }
  }
`;

export const DEFAULT_DEVICE_ID =
  process.env.NEXT_PUBLIC_DEVICE_ID || '83432b29-cdad-48d5-ae85-67a2a8c02d59';

const STORAGE_ALL_KEY = 'aquales_all_measurements';
const STORAGE_PREV_KEY = 'aquales_previous_measurements';

export function useAqualesMeasurements(deviceId: string = DEFAULT_DEVICE_ID) {
  // Mapa com a leitura mais recente de cada dispositivo (por id)
  const [leituras, setLeituras] = useState<LeiturasMap>({});
  // Mapa com a leitura anterior de cada dispositivo (para calcular variação)
  const [leiturasAnteriores, setLeiturasAnteriores] = useState<LeiturasMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  // Lista ordenada de IDs de dispositivos detectados
  const deviceIds = Object.keys(leituras).sort();

  // Carrega leituras salvas no localStorage ao iniciar
  useEffect(() => {
    try {
      const savedAll = localStorage.getItem(STORAGE_ALL_KEY);
      const savedPrev = localStorage.getItem(STORAGE_PREV_KEY);

      if (savedAll) {
        setLeituras(JSON.parse(savedAll));
        setIsLoading(false);
      }
      if (savedPrev) {
        setLeiturasAnteriores(JSON.parse(savedPrev));
      }
    } catch (err) {
      console.warn('Não foi possível recuperar leituras do localStorage:', err);
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;

    let isMounted = true;

    async function fetchPagesByFilter(
      filter: Record<string, unknown>
    ): Promise<AqualesMeasurement[]> {
      const allItems: AqualesMeasurement[] = [];
      let nextToken: string | null = null;

      do {
        const response = (await client.graphql({
          query: LIST_MEASUREMENTS_QUERY,
          variables: { filter, nextToken },
        })) as {
          data?: {
            listAqualesMeasurements?: {
              items?: Array<AqualesMeasurement | null>;
              nextToken?: string | null;
            };
          };
        };

        const connection = response.data?.listAqualesMeasurements;
        if (connection?.items) {
          for (const item of connection.items) {
            if (item) allItems.push(item);
          }
        }
        nextToken = connection?.nextToken ?? null;
      } while (nextToken && isMounted);

      return allItems;
    }

    // 1. Busca inicial no DynamoDB via AppSync para carregar a leitura mais recente (e a anterior) ao abrir a página
    async function fetchInitialMeasurements() {
      try {
        // Filtra primeiro pelas últimas 48h para evitar trafegar todo o histórico da tabela
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        let items = await fetchPagesByFilter({
          id: { eq: deviceId },
          timestamp: { ge: twoDaysAgo },
        });

        // Se o microcontrolador ficou mais de 48h sem enviar dados, busca todo o histórico do id
        if (isMounted && items.length < 2) {
          items = await fetchPagesByFilter({
            id: { eq: deviceId },
          });
        }

        if (!isMounted) return;

        if (items.length > 0) {
          items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          const ultima = items[items.length - 1];
          const penultima = items.length >= 2 ? items[items.length - 2] : null;

          setLeituras((prev) => {
            const existente = prev[ultima.id];
            // Se uma leitura mais nova já chegou via subscription em tempo real, preserva ela
            // e usa `ultima` do banco como leitura anterior (se for mais recente que a anterior salva)
            if (existente && existente.timestamp > ultima.timestamp) {
              setLeiturasAnteriores((prevAnts) => {
                const antExistente = prevAnts[ultima.id];
                if (antExistente && antExistente.timestamp >= ultima.timestamp) {
                  return prevAnts;
                }
                const updatedAnts = { ...prevAnts, [ultima.id]: ultima };
                try {
                  localStorage.setItem(STORAGE_PREV_KEY, JSON.stringify(updatedAnts));
                } catch {}
                return updatedAnts;
              });
              return prev;
            }

            if (penultima) {
              setLeiturasAnteriores((prevAnts) => {
                const updatedAnts = { ...prevAnts, [ultima.id]: penultima };
                try {
                  localStorage.setItem(STORAGE_PREV_KEY, JSON.stringify(updatedAnts));
                } catch {}
                return updatedAnts;
              });
            }

            const updated = { ...prev, [ultima.id]: ultima };
            try {
              localStorage.setItem(STORAGE_ALL_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }

        setError(null);
        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.warn('Erro ao buscar leituras iniciais no AppSync:', err);
        setError(err);
        setIsLoading(false);
      }
    }

    fetchInitialMeasurements();

    // 2. Subscription em tempo real para novas leituras enviadas pelo microcontrolador
    try {
      const subscription = (
        client.graphql({
          query: SUBSCRIPTION_QUERY,
          variables: { id: deviceId },
        }) as any
      ).subscribe({
        next: ({ data }: { data: { onCreateAqualesMeasurements: AqualesMeasurement } }) => {
          const novaLeitura = data?.onCreateAqualesMeasurements;
          if (novaLeitura) {
            const incomingId = novaLeitura.id;
            console.log(`Leitura recebida [${incomingId}]:`, novaLeitura);

            setLeituras((prev) => {
              const leituraAtualDoId = prev[incomingId];

              // Salva a leitura atual como anterior (se existir e for diferente)
              if (leituraAtualDoId && leituraAtualDoId.timestamp !== novaLeitura.timestamp) {
                setLeiturasAnteriores((prevAnts) => {
                  const updated = { ...prevAnts, [incomingId]: leituraAtualDoId };
                  try { localStorage.setItem(STORAGE_PREV_KEY, JSON.stringify(updated)); } catch {}
                  return updated;
                });
              }

              const updated = { ...prev, [incomingId]: novaLeitura };
              try { localStorage.setItem(STORAGE_ALL_KEY, JSON.stringify(updated)); } catch {}
              return updated;
            });

            setError(null);
            setIsConnected(true);
            setIsLoading(false);
          }
        },
        error: (err: any) => {
          console.warn('Erro na subscription GraphQL:', err);
          setError(err);
          setIsConnected(false);
          setIsLoading(false);
        },
      });

      setIsConnected(true);

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch (err) {
      console.warn('Falha ao inicializar a subscription:', err);
      setError(err);
      setIsConnected(false);
      setIsLoading(false);

      return () => {
        isMounted = false;
      };
    }
  }, [deviceId]);

  // Helper para obter a variação de distância de um dispositivo específico
  const getVariacao = useCallback((id: string): number | null => {
    const atual = leituras[id];
    const anterior = leiturasAnteriores[id];
    if (atual && anterior) {
      return Number((atual.water_distance_cm - anterior.water_distance_cm).toFixed(2));
    }
    return null;
  }, [leituras, leiturasAnteriores]);

  // Compatibilidade: retorna a leitura do primeiro dispositivo (ou do selecionado)
  const leitura = deviceIds.length > 0 ? leituras[deviceIds[0]] : null;
  const variacaoDistancia = deviceIds.length > 0 ? getVariacao(deviceIds[0]) : null;

  return {
    // Novo: mapa completo de leituras e IDs
    leituras,
    leiturasAnteriores,
    deviceIds,
    getVariacao,
    // Compatibilidade: leitura simples (primeiro dispositivo)
    leitura,
    variacaoDistancia,
    isLoading,
    isConnected,
    error,
  };
}
