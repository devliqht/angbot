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

## Known limitations

- **Discord modal text fields are hard-capped at 4000 characters.** This is a Discord platform limit, not something configurable on our end. It affects `/editagent` (`src/handlers/editAgent.ts`): if an agent's `systemPrompt` is longer than 4000 characters, only the first 4000 characters will be shown and editable through that command — the rest is silently truncated in the modal (though the full value remains untouched in the database until you actually submit an edit). For editing longer system prompts, use the dashboard instead.
