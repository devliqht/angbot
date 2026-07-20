import { CHAT_MODEL } from "./config";
import { genai } from "./gemini";

// Extension list for plain text & code files
const TEXT_CODE_EXTENSIONS = new Set([
	"txt",
	"md",
	"rmd",
	"markdown",
	"csv",
	"tsv",
	"json",
	"yaml",
	"yml",
	"xml",
	"html",
	"css",
	"c",
	"cpp",
	"h",
	"hpp",
	"cs",
	"java",
	"py",
	"js",
	"jsx",
	"ts",
	"tsx",
	"sql",
	"sh",
	"bat",
	"ps1",
	"r",
	"kt",
	"kts",
	"swift",
	"go",
	"rs",
	"php",
	"rb",
	"m",
	"tex",
	"log",
	"ini",
	"env",
]);

function getExtension(filename: string): string {
	const parts = filename.split(".");
	return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function getMimeTypeFromExt(ext: string): string {
	switch (ext) {
		case "pdf":
			return "application/pdf";
		case "pptx":
			return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
		case "ppt":
			return "application/vnd.ms-powerpoint";
		case "docx":
			return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
		case "doc":
			return "application/msword";
		case "xlsx":
			return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
		case "xls":
			return "application/vnd.ms-excel";
		case "png":
			return "image/png";
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		default:
			return "application/pdf";
	}
}

// Extract plain text from an uploaded document.
//  - text/* or code files: decode UTF-8 bytes directly.
//  - PDF / PPT / DOC / XLS / Images: hand bytes to Gemini multimodal model.
export async function extractText(
	bytes: Uint8Array,
	mimeType: string,
	filename?: string,
): Promise<string> {
	const ext = filename ? getExtension(filename) : "";

	// 1. Text & Code files -> Direct UTF-8 decode
	if (mimeType.startsWith("text/") || TEXT_CODE_EXTENSIONS.has(ext)) {
		return new TextDecoder().decode(bytes);
	}

	// 2. Multimodal documents (PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, Images)
	const resolvedMime =
		mimeType && mimeType !== "application/octet-stream"
			? mimeType
			: getMimeTypeFromExt(ext);

	const data = Buffer.from(bytes).toString("base64");
	const res = await genai().models.generateContent({
		model: CHAT_MODEL,
		contents: [
			{
				role: "user",
				parts: [
					{ inlineData: { mimeType: resolvedMime, data } },
					{
						text: "Extract and return ALL text, code, slides, and tables from this document verbatim as plain UTF-8 text. Preserve structure and reading order. Do not summarize or add commentary.",
					},
				],
			},
		],
	});
	return res.text ?? "";
}
