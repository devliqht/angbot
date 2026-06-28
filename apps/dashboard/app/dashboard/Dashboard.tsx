"use client";

import { useContext, useState } from "react";
import { Agent, DUMMY_DATA } from "../DUMMY_VALUES/servers_and_agents";
import { ServerContext } from '../context/Server_Context'

function AgentCard({ agent }: { agent: Agent }){

    const [expanded, setExpanded] = useState(false);


    return(
        <div className="bg-[#202127] p-5 rounded">
            <button onClick={() => setExpanded(!expanded)} className="w-full text-left cursor-pointer transition-colors">
                <h1 className="text-left">{agent.name}</h1>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? "max-h-40 opacity-100 mt-5" : "max-h-0 opacity-0" }`}>
                <div className="flex px-10 pb-5 pt-5 border-t">
                    <div className="w-full">
                        <h1 className="text-white/50 text-s">Invocations</h1>
                        <h3 className="text-2xl">{agent.invocations}</h3>
                    </div>
                    <div className="w-full">
                        <h1 className="text-white/50 text-s">Tokens Used</h1>
                        <h3 className="text-2xl">{(agent.tokensUsed/1000).toFixed(1)}k</h3>
                    </div>
                    <div className="w-full">
                        <h1 className="text-white/50 text-s">RAG Efficiency</h1>
                        <h3 className="text-2xl">{agent.ragEfficiency}%</h3>
                    </div>
                </div>
            </div>
        </div>
    )

}

export default function Dashboard() {

    const serverContext = useContext(ServerContext);

    if(!serverContext){

        return(
            <h1>
                Error in finding server context: try reloading the website
            </h1>
        );

    }

    const { currentServerId } = serverContext;
    const currentServer = DUMMY_DATA.find((server) => server.id === currentServerId);

    
    if (!currentServer) {
        return <div>Server not found.</div>;
    }
    
    let tokenCount = 0;
    let invocationCount = 0;

    currentServer.agents.map((agent) => {

        tokenCount += agent.tokensUsed;
        invocationCount += agent.invocations;

    })

    return (

        <div className="">
            <div>
                <div className="flex gap-6 mb-8 select-none">
                    <div className="flex flex-col bg-[#202127] p-6 rounded-2xl flex-1 h-36">
                        <div className="w-full">
                            <h1 className="text-white/50 text-xs font-bold uppercase tracking-wider">Current Agents</h1>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <h3 className="text-5xl font-semibold text-white">{currentServer.agents.length}</h3>
                        </div>
                    </div>
                    <div className="flex flex-col bg-[#202127] p-6 rounded-2xl flex-1 h-36">
                        <div className="w-full">
                            <h1 className="text-white/50 text-xs font-bold uppercase tracking-wider">Total Tokens</h1>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <h3 className="text-5xl font-semibold text-white">{(tokenCount / 1000).toFixed(1)}k</h3>
                        </div>
                    </div>
                    <div className="flex flex-col bg-[#202127] p-6 rounded-2xl flex-1 h-36">
                        <div className="w-full">
                            <h1 className="text-white/50 text-xs font-bold uppercase tracking-wider">Total Invocations</h1>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <h3 className="text-5xl font-semibold text-white">{invocationCount.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                {
                    currentServer.agents.map((agent) => {

                        return <AgentCard key={agent.id} agent={agent} />

                    })
                }
            </div>
        </div>

    );
}
