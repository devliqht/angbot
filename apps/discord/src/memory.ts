import type { ChatTurn } from "@project/rag";

const MEMORY_LIMIT = 10;
const channelMemory = new Map<string, ChatTurn[]>();

export function getMemory(channelId: string): ChatTurn[] {
	return channelMemory.get(channelId) ?? [];
}

export function pushMemory(channelId: string, turn: ChatTurn): void {
	const history = channelMemory.get(channelId) ?? [];
	history.push(turn);
	channelMemory.set(channelId, history.slice(-MEMORY_LIMIT));
}
