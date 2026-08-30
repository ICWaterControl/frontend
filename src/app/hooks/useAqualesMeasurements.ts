'use client';

import { useEffect, useState } from 'react';
import { client } from '@/lib/amplifyClient';

export interface AqualesMeasurement {
  id: string;
  timestamp: string;
  water_distance_cm: number;
}

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

const STORAGE_LAST_KEY = 'aquales_last_measurement';
const STORAGE_PREV_KEY = 'aquales_previous_measurement';

export function useAqualesMeasurements(deviceId: string = DEFAULT_DEVICE_ID) {
  const [leitura, setLeitura] = useState<AqualesMeasurement | null>(null);
  const [leituraAnterior, setLeituraAnterior] = useState<AqualesMeasurement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  // Carrega a última leitura salva no localStorage ao iniciar
  useEffect(() => {
    try {
      const savedLast = localStorage.getItem(STORAGE_LAST_KEY);
      const savedPrev = localStorage.getItem(STORAGE_PREV_KEY);

      if (savedLast) {
        setLeitura(JSON.parse(savedLast));
        setIsLoading(false);
      }
      if (savedPrev) {
        setLeituraAnterior(JSON.parse(savedPrev));
      }
    } catch (err) {
      console.warn('Não foi possível recuperar a leitura do localStorage:', err);
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
            console.log('Leitura em tempo real recebida:', novaLeitura);

            setLeitura((currentLeitura) => {
              if (currentLeitura && currentLeitura.timestamp !== novaLeitura.timestamp) {
                setLeituraAnterior(currentLeitura);
                try {
                  localStorage.setItem(STORAGE_PREV_KEY, JSON.stringify(currentLeitura));
                } catch (e) {}
              }
              return novaLeitura;
            });

            try {
              localStorage.setItem(STORAGE_LAST_KEY, JSON.stringify(novaLeitura));
            } catch (e) {}

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

  // Variação em cm em relação à leitura anterior
  const variacaoDistancia =
    leitura && leituraAnterior
      ? Number((leitura.water_distance_cm - leituraAnterior.water_distance_cm).toFixed(2))
      : null;

  return {
    leitura,
    leituraAnterior,
    variacaoDistancia,
    isLoading,
    isConnected,
    error,
  };
}
