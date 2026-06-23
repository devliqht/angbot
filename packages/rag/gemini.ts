import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "./config";

let client: GoogleGenAI | null = null;

// Lazy so importing pure helpers (chunk, similarity) never requires a key —
// only callers that actually hit Gemini pay the "key missing" error.
export function genai(): GoogleGenAI {
	if (!client) {
		if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
		client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
	}
	return client;
}
