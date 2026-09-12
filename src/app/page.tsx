'use client';

import { CaixaDagua } from "./components/CaixaDagua/CaixaDagua";
import InfoBox from "./components/InfoBox";
import { useAqualesMeasurements } from "./hooks/useAqualesMeasurements";
import { INTERVALO_MEDICAO_MIN, calcularMedidas, formatarNumero } from "@/lib/constants";

import { GoAlertFill } from "react-icons/go";
import { RiCheckboxFill } from "react-icons/ri";
import { IoWater } from "react-icons/io5";

export default function Dashboard() {
    const { leituras, deviceIds, getVariacao, leitura, variacaoDistancia, isConnected, error } = useAqualesMeasurements();

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

    // Cálculo da próxima medição
    const formattedNextTimestamp = leitura?.timestamp
        ? (() => {
            const next = new Date(new Date(leitura.timestamp).getTime() + INTERVALO_MEDICAO_MIN * 60 * 1000);
            return next.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        })()
        : null;

    // Medições centralizadas da caixa (distância efetiva sem offset, altura da água, volume, alertas)
    const medidas = calcularMedidas(leitura?.water_distance_cm);

    // Tratamento de variação da distância da água
    let distanciaDescricao = isConnected ? "Tempo real" : "Último registro";
    let distanciaIsIncrease: boolean | null = null;

    if (variacaoDistancia !== null && variacaoDistancia !== undefined) {
        if (variacaoDistancia > 0) {
            distanciaDescricao = `+${formatarNumero(variacaoDistancia)} cm`;
            distanciaIsIncrease = true;
        } else if (variacaoDistancia < 0) {
            distanciaDescricao = `${formatarNumero(variacaoDistancia)} cm`;
            distanciaIsIncrease = false;
        } else {
            distanciaDescricao = "Estável";
            distanciaIsIncrease = null;
        }
    }

    // Quantidade de caixas ativas = quantidade de IDs únicos detectados
    const caixasAtivas = deviceIds.length;

    // Estrutura de dados com as informações das infobox
    const infos = [
        {
            id: 1,
            titulo: "Caixas ativas",
            valor: String(caixasAtivas),
            descricao: caixasAtivas === 0 ? "Aguardando" : "0",
            isIncrease: null,
            icon: <RiCheckboxFill className="w-14 h-14 -translate-x-2 text-green-500" />
        },
        {
            id: 2,
            titulo: "Alertas ativos",
            valor: medidas.hasAlert ? "1" : "0",
            descricao: medidas.isVazio ? "1 crítico (Vazio)" : medidas.isNivelCritico ? "1 crítico (Nível Baixo)" : "Sem alertas",
            isIncrease: medidas.hasAlert ? true : null,
            icon: <GoAlertFill className={`w-12 h-12 -translate-x-2 ${medidas.hasAlert ? 'text-red-500 animate-bounce' : 'text-amber-300'}`} />
        },
        {
            id: 3,
            titulo: "Distância da Água",
            valor: leitura ? `${medidas.distanciaEfetivaFormatada} cm` : "-- cm",
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
                <p className="text-lg text-gray-500">
                    Próxima medição: {formattedNextTimestamp ?? 'Aguardando primeira medição...'}
                </p>
                {error && (
                    <p className="text-sm text-red-500 mt-1">
                        Servidor offline
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
                    <CaixaDagua
                        leituras={leituras}
                        deviceIds={deviceIds}
                        getVariacao={getVariacao}
                        isConnected={isConnected}
                    />
                </div>
            </section>
        </main>
    );
}