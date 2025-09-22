import Image from "next/image";

export function Footer() {
    return (
        <footer className="flex flex-col bg-primary-blue max-h-screen items-center">
            <div className="flex justify-center cursor-pointer py-16">
                <Image src="/logo.svg" alt="Logo" className="w-16" width={10} height={10} />
                <Image src="/logo-text.svg" alt="Logo Text" className="w-54" width={10} height={10} />
            </div> 
        </footer>
    );


}