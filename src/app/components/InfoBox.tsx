import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface InfoBoxProps {
  id: number;
  titulo: string;
  valor: string;
  descricao?: string;
  isIncrease?: boolean | null; // true: subiu, false: desceu, null/undefined: sem variação / neutro
  invertColor?: boolean; // Se true, aumento é vermelho e redução é verde (ex: alertas ou distância)
  icon: React.ReactNode;
}

export default function InfoBox({
  id,
  titulo,
  valor,
  descricao = '',
  isIncrease = null,
  invertColor,
  icon,
}: InfoBoxProps) {
  const isNone = isIncrease === null || isIncrease === undefined || descricao === '0' || descricao === 'Estável';

  let changeColor = 'text-gray-500';

  if (!isNone) {
    // Determina se aumento é ruim (vermelho) ou bom (verde)
    // Para alertas (id 2) e distância da água (id 3 - mais distância = nível menor), aumento é alerta/vermelho
    const isIncreaseBad = invertColor !== undefined ? invertColor : id === 2 || id === 3;

    if (isIncrease) {
      changeColor = isIncreaseBad ? 'text-red-500' : 'text-green-500';
    } else {
      changeColor = isIncreaseBad ? 'text-green-500' : 'text-red-500';
    }
  }

  return (
    <div
      className="bg-white py-5 px-5 rounded-xl shadow-sm border border-gray-200 
                w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
    >
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex flex-col">
          <h3 className="text-sm sm:text-base font-medium text-gray-500">{titulo}</h3>
          <p className="text-3xl font-bold text-gray-800 my-2">{valor}</p>
          <div className={`flex items-center gap-1.5 min-h-[20px] ${changeColor}`}>
            {isNone ? (
              descricao && descricao !== '' ? (
                <div className="w-2.5 h-0.5 bg-gray-400" />
              ) : null
            ) : isIncrease ? (
              <FaArrowUp className="w-3.5 h-3.5" />
            ) : (
              <FaArrowDown className="w-3.5 h-3.5" />
            )}
            {descricao && (
              <span className="font-semibold text-xs sm:text-sm md:text-base">{descricao}</span>
            )}
          </div>
        </div>

        <div className="ml-auto text-gray-600 text-xl sm:text-2xl md:text-3xl">{icon}</div>
      </div>
    </div>
  );
}