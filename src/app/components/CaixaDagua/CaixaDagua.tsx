'use client';

import { useState } from 'react';
import { FaArrowCircleRight, FaArrowCircleLeft } from 'react-icons/fa';
import { AqualesMeasurement } from '@/app/hooks/useAqualesMeasurements';
import { ALTURA_CAIXA_CM, CAPACIDADE_TOTAL_L } from '@/lib/constants';
import './CaixaDagua.css';

interface CaixaDaguaProps {
  leitura?: AqualesMeasurement | null;
  isConnected?: boolean;
}

export function CaixaDagua({ leitura, isConnected }: CaixaDaguaProps) {
  const [manualVolume, setManualVolume] = useState(100);
  const [caixaIndex, setCaixaIndex] = useState(0);

  // Se houver leitura do sensor em tempo real, calcula porcentagem, volume, distância e altura da água
  let currentPercentage: number;
  let currentVolume: number;
  let waterHeightCm: number;
  let distanceToWaterCm: number;

  if (leitura && typeof leitura.water_distance_cm === 'number') {
    distanceToWaterCm = Number(Math.max(0, Math.min(ALTURA_CAIXA_CM, leitura.water_distance_cm)).toFixed(1));
    waterHeightCm = Number(Math.max(0, ALTURA_CAIXA_CM - distanceToWaterCm).toFixed(1));
    currentPercentage = Math.round((waterHeightCm / ALTURA_CAIXA_CM) * 100);
    currentVolume = Math.round((currentPercentage / 100) * CAPACIDADE_TOTAL_L);
  } else {
    currentVolume = manualVolume;
    currentPercentage = Math.round((manualVolume / CAPACIDADE_TOTAL_L) * 100);
    waterHeightCm = Number(((currentPercentage / 100) * ALTURA_CAIXA_CM).toFixed(1));
    distanceToWaterCm = Number((ALTURA_CAIXA_CM - waterHeightCm).toFixed(1));
  }

  const handleAlterarVolume = () => {
    const newVolume = Math.floor(Math.random() * (CAPACIDADE_TOTAL_L + 1));
    setManualVolume(newVolume);
    setCaixaIndex((prevIndex) => (prevIndex + 1) % 3);
  };

  return (
    <div className="flex flex-col items-center font-sans bg-gray-100">
      <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 w-full max-w-md sm:max-w-2xl mx-auto">
        
        {/* Lado Esquerdo: Caixa D'água com Régua Lateral Perfeitamente Alinhada */}
        <div className="flex flex-col items-end flex-shrink-0">
          
          {/* Tampa da Caixa (Alinhada exatamente com o tanque) */}
          <div className="w-[260px] sm:w-[280px]">
            <div className="h-[75px] bg-primary-blue-dark clip-path-lid rounded-2xl z-0"></div>
            <div className="h-[20px] bg-primary-blue-dark rounded-b-2xl rounded-t-3xl mb-2 -translate-y-1 z-0"></div>
          </div>

          {/* Linha com a Régua Lateral e o Corpo do Tanque */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Régua de Cotas (Altura exata de 250px alinhada ao tanque) */}
            <div className="relative h-[250px] w-24 sm:w-28 flex flex-col justify-between text-xs select-none">
              
              {/* Segmento Superior: Distância até a Água */}
              <div
                className="relative flex items-center justify-end border-r-2 border-dashed border-amber-500 pr-2 transition-all duration-1000 ease-in-out"
                style={{ height: `${100 - currentPercentage}%` }}
              >
                {/* Marcador do Topo do Tanque */}
                <div className="absolute top-0 -right-[5px] w-2.5 h-0.5 bg-amber-500" />

                {/* Tag de Distância */}
                <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-md px-1.5 py-0.5 shadow-xs text-right z-10">
                  <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-amber-700 leading-tight">
                    Dist. Água
                  </span>
                  <span className="block font-bold text-xs text-amber-950 leading-tight">
                    {distanceToWaterCm} cm
                  </span>
                </div>

                {/* Marcador na Superfície da Água */}
                <div className="absolute bottom-0 -right-[5px] w-2.5 h-0.5 bg-amber-500" />
              </div>

              {/* Segmento Inferior: Altura da Água */}
              <div
                className="relative flex items-center justify-end border-r-2 border-solid border-blue-600 pr-2 transition-all duration-1000 ease-in-out"
                style={{ height: `${currentPercentage}%` }}
              >
                {/* Marcador na Superfície da Água */}
                <div className="absolute top-0 -right-[5px] w-2.5 h-0.5 bg-blue-600" />

                {/* Tag de Altura da Água */}
                <div className="bg-blue-50 border border-blue-300 text-blue-900 rounded-md px-1.5 py-0.5 shadow-xs text-right z-10">
                  <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-blue-700 leading-tight">
                    Altura Água
                  </span>
                  <span className="block font-bold text-xs text-blue-950 leading-tight">
                    {waterHeightCm} cm
                  </span>
                </div>

                {/* Marcador no Fundo do Tanque */}
                <div className="absolute bottom-0 -right-[5px] w-2.5 h-0.5 bg-blue-600" />
              </div>

            </div>

            {/* Corpo do Tanque */}
            <div className="w-[260px] sm:w-[280px]">
              <div className="relative h-[250px] bg-primary-blue-dark rounded-3xl overflow-hidden shadow-lg z-0">
                {/* Nível da Água */}
                <div
                  id="nivelAgua"
                  className="absolute bottom-0 left-0 right-0 bg-primary-blue-light
                             flex flex-col justify-center items-center
                             transition-all duration-1000 ease-in-out"
                  style={{ height: `${currentPercentage}%` }}
                />

                <div className="absolute inset-0 flex flex-col justify-center items-center text-white z-10">
                  <span className="text-5xl font-bold leading-none drop-shadow-lg">
                    {currentVolume}L
                  </span>
                  <span className="text-2xl font-medium block drop-shadow-md">
                    {currentPercentage}%
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Botões de navegação da caixa */}
          <div className="w-[260px] sm:w-[280px] flex text-center items-center justify-between translate-y-4">
            <button className="cursor-pointer p-1" onClick={handleAlterarVolume}>
              <FaArrowCircleLeft color="blue" size={24} />
            </button>

            <p className="text-primary-blue-dark font-semibold flex-1 text-center mx-4 text-lg">
              Caixa {caixaIndex + 1}
            </p>

            <button className="cursor-pointer p-1" onClick={handleAlterarVolume}>
              <FaArrowCircleRight color="blue" size={24} />
            </button>
          </div>

        </div>

        {/* Informações de Volume e Sensor (POSIÇÃO ANTERIOR NA DIREITA) */}
        <div className="flex flex-col gap-3 mt-10 text-center sm:text-left">
          <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
            Capacidade Total: {CAPACIDADE_TOTAL_L}L
          </div>
          <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
            Volume Atual: {currentVolume}L
          </div>
          <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
            Distância da Água:{' '}
            {leitura ? (
              <span className="text-blue-700 font-bold">{leitura.water_distance_cm} cm</span>
            ) : (
              <span className="text-gray-500 font-normal">Aguardando dados...</span>
            )}
          </div>
          <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
            Altura da Água:{' '}
            <span className="text-blue-700 font-bold">{waterHeightCm} cm</span>
          </div>
          <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold text-sm">
            Altura total da Caixa: {ALTURA_CAIXA_CM} cm
          </div>
          {leitura && (
            <div className="text-xs text-gray-500">
              ID Dispositivo: <span className="font-mono">{leitura.id}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}