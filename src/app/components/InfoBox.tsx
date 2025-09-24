import { FaArrowUp, FaArrowDown } from 'react-icons/fa'; 

interface InfoBoxProps {
  id: number;
  titulo: string;
  valor: string;
  descricao: string;
  isIncrease: boolean; // Controla a cor e o ícone da seta
  icon: React.ReactNode; 
}

export default function InfoBox({ id, titulo, valor, descricao, isIncrease, icon }: InfoBoxProps) {

  let changeColor, isNone = false;

  if (id != 1) {
    changeColor = isIncrease ? 'text-red-500' : 'text-green-500';
  } else {
    changeColor = isIncrease ? 'text-green-500' : 'text-red-500';
    if (descricao === '0') isNone = true;
  }

  return (
    <div className="bg-white py-5 px-5 rounded-xl shadow-sm border border-gray-200 
                w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
      <div className="flex items-center gap-4 md:gap-6">
  
        <div className="flex flex-col">
          <h3 className="text-sm sm:text-base font-medium text-gray-500">{titulo}</h3>
          <p className="text-3xl font-bold text-gray-800 my-2">{valor}</p>
          <div className={`flex items-center gap-1 ${changeColor}`}>
            {
              isNone
              ? <div className='w-3 h-0.5 bg-gray-800' />
              :
              isIncrease 
              ? <FaArrowUp className="w-4 h-4" /> 
              : <FaArrowDown className="w-4 h-4 " />
            }
            <span className="font-semibold text-xs sm:text-sm md:text-base">{descricao}</span>
          </div>
        </div>
        
        <div className='ml-auto text-gray-600 text-xl sm:text-2xl md:text-3xl'>
          {icon}
        </div>

      </div>
    </div>
  );
}