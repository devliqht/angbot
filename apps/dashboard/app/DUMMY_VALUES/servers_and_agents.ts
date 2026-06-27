export type Agent = {
    id: string;
    name: string;
    role: string;
    invocations: number;
    tokensUsed: number;
    ragEfficiency: number; // Percentage (0-100)
    status: "active" | "inactive" | "error";
};

export type EventLog = {
    id: string;
    type: "info" | "success" | "warning" | "error";
    message: string;
    timestamp: string;
};

export type ServerData = {
    id: string;
    name: string;
    totalInvocations: number;
    totalTokensUsed: number;
    agents: Agent[];
    metrics: {
        totalActiveAgents: number;
        totalDeployedAgents: number;
        averageRagEfficiency: number;
        vectorChunksUsed: number;
        vectorChunksTotal: number;
        freeTierTokensUsed: number;
        freeTierTokensTotal: number;
    };
    eventLogs: EventLog[];
};

// Returns exactly ONE array containing all your servers.
// Each server cleanly encapsulates its own agents, metrics, and logs.
export const DUMMY_DATA: ServerData[] = [
    {
        id: "srv_001",
        name: "AABC Dynasty",
        totalInvocations: 1245,
        totalTokensUsed: 200000,
        agents: [
            {
                id: "agt_101",
                name: "Gemini 2.5 Flash",
                role: "Primary Assistant",
                invocations: 850,
                tokensUsed: 120000,
                ragEfficiency: 89,
                status: "active",
            },
            {
                id: "agt_102",
                name: "Gemini 2.5 Flash-lite",
                role: "Fast Responder",
                invocations: 395,
                tokensUsed: 40000,
                ragEfficiency: 95,
                status: "active",
            },
            {
                id: "agt_103",
                name: "Claude Sonnet 5.6",
                role: "Creative Writer",
                invocations: 120,
                tokensUsed: 15000,
                ragEfficiency: 80,
                status: "active",
            },
            {
                id: "agt_104",
                name: "GPT 4",
                role: "Complex Reasoning",
                invocations: 50,
                tokensUsed: 25000,
                ragEfficiency: 92,
                status: "active",
            },
        ],
        metrics: {
            totalActiveAgents: 4,
            totalDeployedAgents: 4,
            averageRagEfficiency: 89,
            vectorChunksUsed: 142,
            vectorChunksTotal: 1000,
            freeTierTokensUsed: 200000,
            freeTierTokensTotal: 500000,
        },
        eventLogs: [
            { id: "evt_001", type: "success", message: "Agent responded to User#1234", timestamp: "5 mins ago" },
            { id: "evt_002", type: "info", message: "System Prompt Updated for Gemini 2.5 Flash", timestamp: "12 mins ago" },
        ],
    },
    {
        id: "srv_002",
        name: "Balai Ni Homer Adrial Dorin",
        totalInvocations: 430,
        totalTokensUsed: 62000,
        agents: [
            {
                id: "agt_201",
                name: "Study Buddy (Llama 3)",
                role: "Tutor",
                invocations: 430,
                tokensUsed: 62000,
                ragEfficiency: 78,
                status: "active",
            },
        ],
        metrics: {
            totalActiveAgents: 1,
            totalDeployedAgents: 1,
            averageRagEfficiency: 78,
            vectorChunksUsed: 45,
            vectorChunksTotal: 500,
            freeTierTokensUsed: 62000,
            freeTierTokensTotal: 100000,
        },
        eventLogs: [
            { id: "evt_003", type: "warning", message: "API Rate-Limit Gracefully Caught (Fallback Message Triggered)", timestamp: "45 mins ago" },
        ],
    },
];