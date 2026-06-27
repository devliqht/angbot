import Main_Page from "./Main";
import { MainProvider } from "../context/Main_Context";
import { ServerProvider } from "../context/Server_Context";

export default function DashboardPage() {
	return (
		<MainProvider>
			<ServerProvider>
				<Main_Page/>
			</ServerProvider>
		</MainProvider>
	);
}
