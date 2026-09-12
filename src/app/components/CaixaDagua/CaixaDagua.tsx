'use client';

import { useState } from 'react';
import { FaArrowCircleRight, FaArrowCircleLeft } from 'react-icons/fa';
import { LeiturasMap } from '@/app/hooks/useAqualesMeasurements';
import { ALTURA_CAIXA_CM, CAPACIDADE_TOTAL_L, calcularMedidas } from '@/lib/constants';
import './CaixaDagua.css';

interface CaixaDaguaProps {
  leituras: LeiturasMap;
  deviceIds: string[];
  getVariacao: (id: string) => number | null;
  isConnected?: boolean;
}

export function CaixaDagua({ leituras, deviceIds, getVariacao, isConnected }: CaixaDaguaProps) {
  const [caixaIndex, setCaixaIndex] = useState(0);

  // Garante que o index está dentro do range válido
  const totalCaixas = deviceIds.length;
  const safeIndex = totalCaixas > 0 ? caixaIndex % totalCaixas : 0;
  const selectedId = totalCaixas > 0 ? deviceIds[safeIndex] : null;
  const leitura = selectedId ? leituras[selectedId] : null;

  // Medições centralizadas da caixa (fonte única de verdade)
  const medidas = calcularMedidas(leitura?.water_distance_cm);
  const currentPercentage = medidas.porcentagem;
  const currentVolume = medidas.volumeL;

  const handlePrev = () => {
    setCaixaIndex((prev) => (prev - 1 + Math.max(totalCaixas, 1)) % Math.max(totalCaixas, 1));
  };

  const handleNext = () => {
    setCaixaIndex((prev) => (prev + 1) % Math.max(totalCaixas, 1));
  };

  return (
    <div className="flex flex-col items-center font-sans bg-gray-100">
      <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 w-full max-w-md sm:max-w-2xl mx-auto">

        {/* Lado Esquerdo: Caixa D'água com Régua Lateral */}
        <div className="flex flex-col items-end flex-shrink-0 mr-25 md:mr-0">

          {/* Tampa da Caixa */}
          <div className="w-[260px] sm:w-[280px]">
            <div className="h-[75px] bg-primary-blue-dark clip-path-lid rounded-2xl z-0"></div>
            <div className="h-[20px] bg-primary-blue-dark rounded-b-2xl rounded-t-3xl mb-2 -translate-y-1 z-0"></div>
          </div>

          {/* Régua Lateral + Corpo do Tanque */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Régua de Cotas */}
            <div className="relative h-[250px] w-24 sm:w-28 flex flex-col justify-between text-xs select-none">

              {/* Segmento Superior: Distância até a Água */}
              <div
                className="relative flex items-center justify-end border-r-2 border-dashed border-amber-500 pr-2 transition-all duration-1000 ease-in-out"
                style={{ height: `${100 - currentPercentage}%` }}
              >
                <div className="absolute top-0 -right-[5px] w-2.5 h-0.5 bg-amber-500" />
                <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-md px-1.5 py-0.5 shadow-xs text-right z-10">
                  <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-amber-700 leading-tight">
                    Dist. Água
                  </span>
                  <span className="block font-bold text-xs text-amber-950 leading-tight">
                    {medidas.distanciaEfetivaFormatada} cm
                  </span>
                </div>
                <div className="absolute bottom-0 -right-[5px] w-2.5 h-0.5 bg-amber-500" />
              </div>

              {/* Segmento Inferior: Altura da Água */}
              <div
                className="relative flex items-center justify-end border-r-2 border-solid border-blue-600 pr-2 transition-all duration-1000 ease-in-out"
                style={{ height: `${currentPercentage}%` }}
              >
                <div className="absolute top-0 -right-[5px] w-2.5 h-0.5 bg-blue-600" />
                <div className="bg-blue-50 border border-blue-300 text-blue-900 rounded-md px-1.5 py-0.5 shadow-xs text-right z-10">
                  <span className="block text-[8px] sm:text-[9px] uppercase font-bold text-blue-700 leading-tight">
                    Altura Água
                  </span>
                  <span className="block font-bold text-xs text-blue-950 leading-tight">
                    {medidas.alturaAguaFormatada} cm
                  </span>
                </div>
                <div className="absolute bottom-0 -right-[5px] w-2.5 h-0.5 bg-blue-600" />
              </div>

            </div>

            {/* Corpo do Tanque */}
            <div className="w-[260px] sm:w-[280px]">
              <div className="relative h-[250px] bg-primary-blue-dark rounded-3xl overflow-hidden shadow-lg z-0">
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

          {/* Botões de navegação entre caixas */}
          <div className="w-[260px] sm:w-[280px] flex text-center items-center justify-between translate-y-4">
            <button
              className="cursor-pointer p-1 disabled:opacity-30 disabled:cursor-default"
              onClick={handlePrev}
              disabled={totalCaixas <= 1}
            >
              <FaArrowCircleLeft color="blue" size={24} />
            </button>

            <p className="text-primary-blue-dark font-semibold flex-1 text-center mx-4 text-lg">
              {totalCaixas > 0
                ? `Caixa ${safeIndex + 1} de ${totalCaixas}`
                : 'Aguardando caixas...'}
            </p>

            <button
              className="cursor-pointer p-1 disabled:opacity-30 disabled:cursor-default"
              onClick={handleNext}
              disabled={totalCaixas <= 1}
            >
              <FaArrowCircleRight color="blue" size={24} />
            </button>
          </div>

        </div>

        {/* Informações de Volume e Sensor */}
        <div className="flex flex-col gap-3 mt-10 mr-4 md:mr-0 text-center sm:text-left">
          <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
            Capacidade Total: {CAPACIDADE_TOTAL_L}L
          </div>
          <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
            Volume Atual: {currentVolume}L
          </div>
          <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
            Distância da Água:{' '}
            {leitura ? (
              <span className="text-blue-700 font-bold">{medidas.distanciaEfetivaFormatada} cm</span>
            ) : (
              <span className="text-gray-500 font-normal">Aguardando dados...</span>
            )}
          </div>
          <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
            Altura da Água:{' '}
            <span className="text-blue-700 font-bold">{medidas.alturaAguaFormatada} cm</span>
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