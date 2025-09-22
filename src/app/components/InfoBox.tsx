import { FaArrowUp, FaArrowDown } from 'react-icons/fa'; 

interface StatsCardProps {
  titulo: string;
  valor: string | number;
  descricao: string;
  status: 'increase' | 'decrease'; // Controla a cor e o ícone da seta
  //icon: React.ReactNode; 
}

export default function InfoBox({ titulo, valor, descricao, status,/* icon*/ }: StatsCardProps) {
  const isIncrease = status === 'increase';
  const changeColor = isIncrease ? 'text-green-500' : 'text-red-500';

  return (
    <div className="bg-white py-5 pr-36 pl-5 rounded-xl shadow-sm border border-gray-200 max-w-xs">
      <div className="flex justify-between items-start">
        
        <div className="flex flex-col">
          <h3 className="text-base font-medium text-gray-500">{titulo}</h3>
          <p className="text-4xl font-bold text-gray-800 my-2">{valor}</p>
          <div className={`flex items-center gap-1 ${changeColor}`}>
            {isIncrease 
              ? <FaArrowUp className="w-4 h-4" /> 
              : <FaArrowDown className="w-4 h-4" />
            }
            <span className="font-semibold">{descricao}</span>
          </div>
        </div>
        
        <div>
          {/*icon*/}
        </div>

      </div>
    </div>
  );
}