import Image from "next/image";
import logo from "../images/logo_final.png";

export default function HomepageButton() {
	return (
		<button type="button" className="flex items-center gap-1 cursor-pointer">
			<Image src={logo} alt="Logo" width={60} height={60} />
			<p className="text-3xl tracking-widest">Angbot</p>
		</button>
	);
}
