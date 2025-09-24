import Image from "next/image";

import { AiOutlineMenu } from "react-icons/ai";

export function Header() {
    return (
        <header className="flex justify-center fixed z-10 w-full px-8 3xl:px-20 items-center-safe bg-primary-blue">
            <div className="flex justify-center mr-12 items-center cursor-pointer">
                <AiOutlineMenu size={24} className="text-secondary-blue" />
            </div>
            <div className="flex justify-center items-center cursor-pointer py-4">
                <Image src="/logo.svg" alt="Logo" className=" w-12" width={10} height={10} />
                <Image src="/logo-text.svg" alt="Logo Text" className="w-48" width={10} height={10} />
            </div>
            <div className="flex items-center gap-3 ml-auto pr-10 mt-2">
                <div className="w-4 h-4 rounded-full bg-green-ball"></div>
                <p className="text-secondary-blue font-semibold text-sm -translate-y-0.5">Sistema Online</p>
            </div>
        </header>
    )
}