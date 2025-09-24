import Image from "next/image";
import { AiOutlineMenu } from "react-icons/ai";

export function Header() {
    return (
        <header className="flex justify-center fixed z-10 w-full px-4 md:px-8 bg-primary-blue">
            <div className="w-full flex justify-between items-center">

                {/* Menu e Logo */}
                <div className="flex items-center gap-4">
                   
                    <div className="md:hidden cursor-pointer">
                        <AiOutlineMenu size={24} className="text-secondary-blue" />
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 md:relative md:left-auto md:translate-x-0 flex items-center cursor-pointer py-4">
                        {/* Logo Ícone */}
                        <Image
                            src="/logo.svg"
                            alt="Logo"
                            className="w-10 h-10 md:w-12 md:h-12"
                            width={48}
                            height={48}
                        />
                        {/* Logo Texto */}
                        <Image
                            src="/logo-text.svg"
                            alt="Logo Text"
                            className="hidden md:block w-48"
                            width={192}
                            height={40}
                        />
                    </div>

                </div>

                {/* Status do Sistema */}
                <div className="flex items-center gap-3 py-5">
                    <div className="w-4 h-4 rounded-full bg-green-ball flex-shrink-0"></div>
                    <p className="hidden md:block text-secondary-blue font-semibold text-sm">
                        Sistema Online
                    </p>
                </div>
                
            </div>
        </header>
    );
}