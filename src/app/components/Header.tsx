import Image from "next/image";

import { AiOutlineMenu } from "react-icons/ai";

export function Header() {
    return (
        <header className="flex justify-center px-8 3xl:px-20 items-center-safe bg-primary-blue">
            <div className="flex justify-center mr-12 items-center cursor-pointer">
                <AiOutlineMenu size={36} className="text-secondary-blue" />
            </div>
            <div className="flex justify-center items-center cursor-pointer">
                <Image src="/logo.svg" alt="Logo" className="py-4 w-16" width={10} height={10} />
                <Image src="/logo-text.svg" alt="Logo Text" className="w-54" width={10} height={10} />
            </div>
            <div className="flex justify-center items-center gap-3 right-0 ml-auto mt-2 ">
                <div className="w-5 h-5 rounded-full bg-green-ball"></div>
                <p className="text-secondary-blue font-semibold">Sistema Online</p>
            </div>
        </header>
    )
}