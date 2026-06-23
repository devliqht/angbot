import { CHAT_MODEL } from "./config";
import { genai } from "./gemini";

// Extract plain text from an uploaded document.
//  - text/*  : decode bytes directly.
//  - PDF     : hand the bytes to Gemini (multimodal) — handles scanned/complex
//              PDFs without a parser dependency. ponytail: inline base64 is
//              simplest; switch to the Files API if files get large (>~20MB).
export async function extractText(bytes: Uint8Array, mimeType: string): Promise<string> {
	if (mimeType.startsWith("text/")) {
		return new TextDecoder().decode(bytes);
	}
	if (mimeType === "application/pdf") {
		const data = Buffer.from(bytes).toString("base64");
		const res = await genai().models.generateContent({
			model: CHAT_MODEL,
			contents: [
				{
					role: "user",
					parts: [
						{ inlineData: { mimeType, data } },
						{
							text: "Extract and return ALL text from this document verbatim as plain UTF-8 text. Preserve reading order. Do not summarize or add commentary.",
						},
					],
				},
			],
		});
		return res.text ?? "";
	}
	throw new Error(`Unsupported mimeType for extraction: ${mimeType}`);
}
