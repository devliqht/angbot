"use client"
import SidePanel from '../components/side_panel'
import { useContext, useState } from 'react'
import { MainContext, MainProvider } from '../context/Main_Context';
import { ServerContext, ServerProvider } from '../context/Server_Context';
import { FaUserCircle } from 'react-icons/fa';
import Dashboard from '../dashboard/Dashboard'
import Agents from '../agents/Agents'

//Dummy Data
import { DUMMY_DATA } from '../DUMMY_VALUES/servers_and_agents'

function Header({ currPage }: { currPage: string }){

	const serverContext = useContext(ServerContext);

	if(!serverContext){

		throw new Error("Error in finding the right server");

	}

	const { currentServerId, setCurrentServerId } = serverContext;

	return(
		<div className="flex items-center justify-between w-full">
			<div>
				<h1 className="text-4xl font-bold">{currPage}</h1>
			</div>
			<div className="flex items-center gap-3 h-full">
				<div>
					<select 
						value={currentServerId}
						onChange={(e) => setCurrentServerId(e.target.value)}
						className="text-white rounded-lg px-3 py-3 outline-none cursor-pointer font-bold text-right"
					>
						{DUMMY_DATA.map((server) => (

							<option key={server.id} value={server.id}>

								{server.name}

							</option>

						))}
					</select>
				</div>
				<div>
					<FaUserCircle className="w-10 h-10 text-white"/>
				</div>
			</div>
		</div>
	)

}

export default function Main_Page(){

	const context = useContext(MainContext);

	if(!context){

		throw new Error("Error in main page");

	}

	const { currentPage, setCurrentPage } = context;

	return (
		<div className="h-screen flex items-center justify-center overflow-hidden">
			<SidePanel/>
			<div className="h-screen flex-1 flex flex-col">
				<div className="flex items-center w-full h-[7%] min-h-[60px] px-6 flex-shrink-0 border-b border-gray-800">
					<Header currPage={currentPage} />
				</div>
				<div className="flex-1 overflow-y-auto p-6">
					{currentPage === 'Dashboard' && <Dashboard />}
					{currentPage === 'Agents' && <Agents />}
				</div>
			</div>
		</div>
	);
}

