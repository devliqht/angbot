"use client"
import SidePanel from '../components/side_panel'
import { useContext, useState } from 'react'
import { MainContext, MainProvider } from '../context/Main_Context';
import { FaUserCircle } from 'react-icons/fa';
import Dashboard from '../dashboard/Dashboard'
import Agents from '../agents/Agents'

function AccountButton(){

	return(
		<div className="flex items-center gap-3 h-full">
			<div>
				Current Server Name
			</div>
			<div>
				<FaUserCircle className="w-10 h-10 text-white"/>
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
		<div className="h-screen flex items-center justify-center">
			<SidePanel/>
			<div className="h-screen flex-1">
				<div className="flex items-center justify-end h-[7%] p-2">
					<AccountButton/>
				</div>
				<div className="h-full">
					{currentPage === 'dashboard' && <Dashboard />}
					{currentPage === 'agents' && <Agents />}
				</div>
			</div>
		</div>
	);
}

