const DISCORD_MESSAGE_LIMIT = 2000;
const FENCE = "```";
const BLOCKQUOTE_MARKER = ">>>";

function parseFence(line: string): { isFence: boolean; lang: string } {
	const trimmed = line.trim();
	if (!trimmed.startsWith(FENCE)) return { isFence: false, lang: "" };
	return { isFence: true, lang: trimmed.slice(FENCE.length) };
}

// Discord's `>>> ` multi-line blockquote has no closing syntax — once it
// appears, everything from there to the end of that message is quoted.
// Other formatting (bold, italic, strikethrough, underline, spoilers,
// headers, lists, single-line `> ` quotes, masked links) is self-contained
// within a single line, so splitting on line boundaries — which this
// function does whenever possible — already preserves it without any
// special-casing.
function startsBlockquote(line: string): boolean {
	return /^>>>(\s|$)/.test(line.trim());
}

// Splits text into Discord-safe chunks (each <= maxLength). A ``` code block
// or a `>>> ` blockquote that would otherwise be cut mid-way is carried over:
// the code block is closed at the end of one chunk and reopened (with the
// same language tag) at the start of the next; the blockquote marker is
// simply re-added at the start of the next chunk (it has no closing form).
// This keeps every chunk a complete, self-contained, validly-rendering
// message on its own.
export function splitMessage(
	text: string,
	maxLength: number = DISCORD_MESSAGE_LIMIT,
): string[] {
	if (text.length <= maxLength) return [text];

	const lines = text.split("\n");
	const chunks: string[] = [];
	let current = "";
	let inCodeBlock = false;
	let codeBlockLang = "";
	let inBlockquote = false;

	const reopenPrefix = (): string => {
		const parts: string[] = [];
		if (inBlockquote) parts.push(BLOCKQUOTE_MARKER);
		if (inCodeBlock) parts.push(`${FENCE}${codeBlockLang}`);
		return parts.join("\n");
	};

	const flush = () => {
		if (!current) return;
		chunks.push(inCodeBlock ? `${current}\n${FENCE}` : current);
		current = reopenPrefix();
	};

	const append = (line: string) => {
		current = current ? `${current}\n${line}` : line;
	};

	for (const originalLine of lines) {
		let line = originalLine;

		const prefix = reopenPrefix();
		let reserve = inCodeBlock ? FENCE.length + 1 : 0; // room for closing fence
		const lineLimit = Math.max(
			100,
			maxLength - (prefix ? prefix.length + 1 : 0) - reserve,
		);

		// Hard-wrap a single line that alone (or with reopen prefix) exceeds maxLength.
		while (line.length > lineLimit) {
			flush();
			const currentReserve = inCodeBlock ? FENCE.length + 1 : 0;
			const budget = Math.max(
				maxLength - current.length - (current ? 1 : 0) - currentReserve,
				100,
			);
			const slice = line.slice(0, budget);
			append(slice);
			flush();
			line = line.slice(slice.length);
		}

		reserve = inCodeBlock ? FENCE.length + 1 : 0; // room for closing fence
		const prospectiveLength =
			(current ? current.length + 1 : 0) + line.length + reserve;

		if (current && prospectiveLength > maxLength) {
			flush();
		}

		append(line);

		if (startsBlockquote(line)) {
			inBlockquote = true;
		}

		const fence = parseFence(line);
		if (fence.isFence) {
			if (inCodeBlock) {
				inCodeBlock = false;
				codeBlockLang = "";
			} else {
				inCodeBlock = true;
				codeBlockLang = fence.lang;
			}
		}
	}

	flush();

	return chunks;
}
