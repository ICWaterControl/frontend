'use client';

import { useState } from 'react';
import { FaArrowCircleRight, FaArrowCircleLeft } from "react-icons/fa";
import './CaixaDagua.css';  

export function CaixaDagua() {
    const totalCapacity = 250; // Capacidade total em litros
    const [volume, setVolume] = useState(100); // Volume atual em litros
    const [caixaIndex, setCaixaIndex] = useState(1);

    // MOCK DE DADOS 
    const currentPercentage = Math.round((volume / totalCapacity) * 100);
    const handleAlterarVolume = () => { // Gera um volume aleatório entre 0 e a capacidade total
        const newVolume = Math.floor(Math.random() * (totalCapacity + 1));
        setVolume(newVolume);
        setCaixaIndex((prevIndex) => (prevIndex + 1) % 3);
    };

    return (
        <div className="flex flex-col items-center p-4 font-sans bg-gray-100"> {/* Removi min-h-screen e justify-center para evitar ocupação total da tela e sobreposição com header fixo. Adicione pt-[altura-do-header] se necessário, ex: pt-16 para um header de ~64px */}
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 w-full max-w-md sm:max-w-2xl mx-auto"> {/* Adicionei max-w e mx-auto para centralizar sem forçar altura total */}
                
                {/* Contêiner da Caixa D'água */}
                <div className="w-[300px] flex-shrink-0">

                    {/* Tampa */}
                    <div className="h-[75px] bg-primary-blue-dark clip-path-lid rounded-2xl z-0"></div> {/* Adicionei z-0 para garantir que fique abaixo de elementos fixos como header */}
                    <div className="h-[20px] bg-primary-blue-dark rounded-b-2xl rounded-t-3xl mb-2 -translate-y-1 z-0"></div> {/* Mesmo z-index para consistência */}

                    {/* Tanque */}
                    <div className="relative h-[250px] bg-primary-blue-dark rounded-3xl overflow-hidden shadow-lg z-0"> {/* z-0 para manter abaixo */}

                        {/* Nível da Água */}
                        <div
                            id="nivelAgua"
                            className="absolute bottom-0 left-0 right-0 bg-primary-blue-light
                                       flex flex-col justify-center items-center
                                       transition-all duration-1500 ease-in-out"
                            style={{ height: `${currentPercentage}%` }}
                        />

                        <div className="absolute inset-0 flex flex-col justify-center items-center text-white z-10">
                            <span className="text-5xl font-bold leading-none drop-shadow-lg">{volume}L</span>
                            <span className="text-2xl font-medium block drop-shadow-md">{currentPercentage}%</span>
                        </div>
                    </div>

                    {/* Botões que muda Tanque */}
                    <div className='w-full flex text-center items-center justify-between translate-y-4'>
                        <button 
                            className="cursor-pointer p-1" 
                            onClick={handleAlterarVolume}
                        >
                            <FaArrowCircleLeft color='blue' size={24} />
                        </button>

                        <p className="text-primary-blue-dark font-semibold flex-1 text-center mx-4 text-lg"> 
                            Caixa {caixaIndex+1} 
                        </p>

                        <button 
                            className="cursor-pointer p-1" 
                            onClick={handleAlterarVolume}
                        >
                            <FaArrowCircleRight color='blue' size={24} />
                        </button>
                    </div>
                </div>

                {/* Informações de Volume */}
                <div className="flex flex-col gap-3 text-center sm:text-left">
                    <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
                        Capacidade Total: {totalCapacity}L
                    </div>
                    <div className="bg-info-blue-light p-3 rounded-lg shadow-sm text-primary-blue-dark font-semibold">
                        Volume Atual: {volume}L
                    </div>
                </div>
            </div>
           
        </div>  
    );
}