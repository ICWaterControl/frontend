import { CaixaDagua } from "./components/CaixaDagua/CaixaDagua";
import InfoBox from "./components/InfoBox";

import { GoAlertFill } from "react-icons/go";
import { RiCheckboxFill } from "react-icons/ri";
import { IoWater } from "react-icons/io5";

export default function Dashboard() {

    // Estrutura de dados com as informações das infobox
    const infos = [
        {
            id: 1, 
            titulo: "Caixas ativas",
            valor: "3",
            descricao: "0",
            isIncrease: true,
            icon: <RiCheckboxFill className="w-14 h-14 -translate-x-2 text-green-500" />
        },
        {
            id: 2,
            titulo: "Alertas ativos",
            valor: "1",
            descricao: "1 crítico",
            isIncrease: true,
            icon: <GoAlertFill className="w-12 h-12 -translate-x-2 text-amber-300" />
        },
        {
            id: 3,
            titulo: "Consumo Médio",
            valor: "73L",
            descricao: "+90%",
            isIncrease: true,
            icon: <IoWater className="w-16 h-16 text-primary-blue-light" />
        }
    ];

    return (
        <main className="bg-gray-100 min-h-screen">
            <section className="px-14 md:px-28 pt-24 md:pt-32">
                <h1 className="text-4xl font-bold text-neutral-800 mb-4">Dashboard</h1>
                <p className="text-xl">Última medição: 16/09/2025 - 6:00</p>
            </section>
            <section className="w-full flex grid-cols-2 gap-10 md:gap-24 xl:gap-76 py-8 lg:items-center md:px-18 lg:px-28 pb-18 lg:flex-row flex-col">
                <div className="flex flex-col items-start md:items-center px-14 md:px-0 md:flex-row lg:flex-col gap-8 md:gap-6 lg:gap-4">
                    {infos.map(info => (
                        <InfoBox key={info.id} {...info} />
                    ))}
                </div>
                <div className="">
                    <CaixaDagua />
                </div>
            </section>
        </main>
    );
}