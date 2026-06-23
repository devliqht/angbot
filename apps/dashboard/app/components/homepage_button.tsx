import logo from '../images/logo.png'

export default function HomepageButton() {
    return (
        <button className="flex items-center gap-1 cursor-pointer">
            <img src={logo.src} alt="Logo" width={60} height={60} />
            <p className="text-3xl tracking-widest">Angbot</p>
        </button>
    );
}