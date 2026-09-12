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

const SUBSCRIPTION_QUERY = /* GraphQL */ `
  subscription OnCreateMeasurement($id: String!) {
    onCreateAqualesMeasurements(id: $id) {
      id
      timestamp
      water_distance_cm
    }
  }
`;

const DEFAULT_DEVICE_ID =
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
                  try { localStorage.setItem(STORAGE_PREV_KEY, JSON.stringify(updated)); } catch (e) { }
                  return updated;
                });
              }

              const updated = { ...prev, [incomingId]: novaLeitura };
              try { localStorage.setItem(STORAGE_ALL_KEY, JSON.stringify(updated)); } catch (e) { }
              return updated;
            });

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
        subscription.unsubscribe();
      };
    } catch (err) {
      console.warn('Falha ao inicializar a subscription:', err);
      setError(err);
      setIsConnected(false);
      setIsLoading(false);
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
