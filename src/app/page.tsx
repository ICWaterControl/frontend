'use client';

import { CaixaDagua } from "./components/CaixaDagua/CaixaDagua";
import InfoBox from "./components/InfoBox";
import { useAqualesMeasurements } from "./hooks/useAqualesMeasurements";
import { ALTURA_CAIXA_CM, LIMIAR_NIVEL_CRITICO_PERCENT } from "@/lib/constants";

import { GoAlertFill } from "react-icons/go";
import { RiCheckboxFill } from "react-icons/ri";
import { IoWater } from "react-icons/io5";

export default function Dashboard() {
    const { leitura, variacaoDistancia, isConnected, error } = useAqualesMeasurements();

    const formattedTimestamp = leitura?.timestamp
        ? new Date(leitura.timestamp).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
        : (leitura?.timestamp || 'Aguardando dados do dispositivo...');

    // Alerta crítico com base na altura global da caixa
    const isVazio = leitura ? leitura.water_distance_cm >= ALTURA_CAIXA_CM : false;
    const isNivelCritico = leitura ? leitura.water_distance_cm >= (ALTURA_CAIXA_CM * (1 - LIMIAR_NIVEL_CRITICO_PERCENT)) : false;
    const hasAlert = isVazio || isNivelCritico;

    // Tratamento de variação da distância da água
    let distanciaDescricao = isConnected ? "Tempo real" : "Último registro";
    let distanciaIsIncrease: boolean | null = null;

    if (variacaoDistancia !== null && variacaoDistancia !== undefined) {
        if (variacaoDistancia > 0) {
            distanciaDescricao = `+${variacaoDistancia} cm`;
            distanciaIsIncrease = true; // Distância aumentou (nível da água baixou)
        } else if (variacaoDistancia < 0) {
            distanciaDescricao = `${variacaoDistancia} cm`;
            distanciaIsIncrease = false; // Distância diminuiu (nível da água subiu)
        } else {
            distanciaDescricao = "Estável";
            distanciaIsIncrease = null;
        }
    }

    // Estrutura de dados com as informações das infobox
    const infos = [
        {
            id: 1,
            titulo: "Caixas ativas",
            valor: "1",
            descricao: "0",
            isIncrease: null,
            icon: <RiCheckboxFill className="w-14 h-14 -translate-x-2 text-green-500" />
        },
        {
            id: 2,
            titulo: "Alertas ativos",
            valor: hasAlert ? "1" : "0",
            descricao: isVazio ? "1 crítico (Vazio)" : isNivelCritico ? "1 crítico (Nível Baixo)" : "Sem alertas",
            isIncrease: hasAlert ? true : null,
            icon: <GoAlertFill className={`w-12 h-12 -translate-x-2 ${hasAlert ? 'text-red-500 animate-bounce' : 'text-amber-300'}`} />
        },
        {
            id: 3,
            titulo: "Distância da Água",
            valor: leitura ? `${leitura.water_distance_cm} cm` : "-- cm",
            descricao: distanciaDescricao,
            isIncrease: distanciaIsIncrease,
            icon: <IoWater className="w-16 h-16 text-primary-blue-light" />
        }
    ];

    return (
        <main className="bg-gray-100 min-h-screen">
            <section className="px-14 md:px-28 pt-24 md:pt-32">
                <h1 className="text-4xl font-bold text-neutral-800 mb-4">Dashboard</h1>
                <p className="text-xl text-gray-700">
                    Última medição: {leitura ? formattedTimestamp : 'Aguardando medição do dispositivo...'}
                </p>
                {error && (
                    <p className="text-sm text-red-500 mt-1">
                        Aviso de conexão: Verifique as variáveis de ambiente do AppSync no .env
                    </p>
                )}
            </section>
            <section className="w-full flex grid-cols-2 gap-10 md:gap-24 xl:gap-76 py-8 lg:items-center md:px-18 lg:px-28 pb-18 lg:flex-row flex-col">
                <div className="flex flex-col items-start md:items-center px-14 md:px-0 md:flex-row lg:flex-col gap-8 md:gap-6 lg:gap-4">
                    {infos.map(info => (
                        <InfoBox key={info.id} {...info} />
                    ))}
                </div>
                <div className="">
                    <CaixaDagua leitura={leitura} isConnected={isConnected} />
                </div>
            </section>
        </main>
    );
}