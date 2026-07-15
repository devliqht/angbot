# discord

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Long message handling

Discord caps message content at **2000 characters**. Before `src/splitMessage.ts` existed, `handleMessage` (`src/handlers/message.ts`) sent AI replies with a single `message.reply(responseText)` call — if a response (especially a code-heavy one) exceeded that limit, the call threw, the outer `catch` swallowed it silently, and the user got **no reply at all** with no logged `AgentCall` telemetry, just a console error.

Naively chopping a long response into 2000-char pieces isn't enough on its own, because Discord parses each sent message independently — cutting a ` ``` ` code block or `>>> ` blockquote in half mid-way corrupts the formatting: the first message renders as an unterminated block, and the second loses its formatting entirely since there's no state carried over between separate messages.

`splitMessage()` solves both problems: it splits a response into Discord-safe chunks, and whenever a cut point falls inside an open code block or blockquote, it closes/reopens those markers across the boundary so every resulting message renders as a complete, valid block on its own — not just a length fix, but a formatting-preserving one. All other Markdown Discord supports (bold, italic, headers, lists, single-line quotes, spoilers) is self-contained within a single line and needs no special handling, since the splitter always prefers breaking on line boundaries.

## Known limitations

- **Discord modal text fields are hard-capped at 4000 characters.** This is a Discord platform limit, not something configurable on our end. It affects `/editagent` (`src/handlers/editAgent.ts`): if an agent's `systemPrompt` is longer than 4000 characters, only the first 4000 characters will be shown and editable through that command — the rest is silently truncated in the modal (though the full value remains untouched in the database until you actually submit an edit). For editing longer system prompts, use the dashboard instead.
