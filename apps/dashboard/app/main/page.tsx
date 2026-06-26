import Main_Page from "./Main";
import { MainProvider } from "../context/Main_Context";

export default function DashboardPage() {
	return (
		<MainProvider>
			<Main_Page/>
		</MainProvider>
	);
}
