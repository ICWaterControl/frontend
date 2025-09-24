//import { CaixaDagua } from "./components/CaixaDagua/CaixaDagua";

import { CaixaDagua } from "./components/CaixaDagua/CaixaDagua";
import InfoBox from "./components/InfoBox";


export default function Dashboard() {
    return (
        <main className="bg-gray-100 min-h-screen">
            <section className="px-28 pt-32">
                <h1 className="text-4xl font-bold text-neutral-800 mb-4">Dashboard</h1>
                <p className="text-xl">Última medição: 16/09/2025 - 6:00</p>
            </section>
            <section className="w-full flex grid-cols-2 gap-75 py-8 px-36 items-center justify-center pb-18 lg:px-20 3xl:px-36 lg:flex-row flex-col">
                <div className="flex flex-col gap-8 md:gap-6 lg:gap-4">
                    <InfoBox titulo="Caixas ativas" valor={3} descricao="0" status='increase'/>
                    <InfoBox titulo="Alertas ativos" valor={1} descricao="1 crítico" status='increase'/>
                    <InfoBox titulo="Consumo Médio" valor="21L" descricao="-12%" status='increase'/>
                </div>
                <div className="">
                    <CaixaDagua />
                </div>
            </section>
        </main>
    );
}