# Functional Requirements Document

This document lists the functional requirements identified from the AngBot codebase, grouped by functional categories. Each category is identified by a code in the format `FUNC-XXX` and displays the total count of requirements within it.

Each requirement (formatted as `FUNC-XXX-YYY`) specifies its description, priority (**Required** or **Optional**), and implementation status (**Implemented** or **Not started**).

---

## Summary of Functional Requirements

| Category ID | Category Name | Total Requirements | Implemented | Not Started |
|-------------|---------------|:------------------:|:-----------:|:-----------:|
| [FUNC-001](#func-001-user-authentication-and-account-management) | User Authentication and Account Management | 5 | 5 | 0 |
| [FUNC-002](#func-002-web-dashboard-ui-and-telemetry) | Web Dashboard UI and Telemetry | 6 | 6 | 0 |
| [FUNC-003](#func-003-agent-and-subagent-configuration) | Agent and Subagent Configuration | 9 | 9 | 0 |
| [FUNC-004](#func-004-rag-context-engine) | RAG Context Engine | 8 | 7 | 1 |
| [FUNC-005](#func-005-discord-bot-integration) | Discord Bot Integration | 9 | 9 | 0 |
| [FUNC-006](#func-006-model-context-protocol-mcp-integration) | Model Context Protocol (MCP) Integration | 4 | 4 | 0 |
| **Total**   | | **41** | **40** | **1** |

---

## FUNC-001: User Authentication and Account Management
**Total Requirements Count:** 5

| Requirement ID | Description | Priority | Status |
|---|---|---|---|
| **FUNC-001-001** | Support user authentication and login using Discord OAuth. | Required | Implemented |
| **FUNC-001-002** | Support user authentication and login using Google OAuth. | Required | Implemented |
| **FUNC-001-003** | Support standard user signup and login using email and password credentials. | Required | Implemented |
| **FUNC-001-004** | Store user passwords securely in the database by hashing them prior to persistence. | Required | Implemented |
| **FUNC-001-005** | Enable email account linking across OAuth providers and credentials (merging same-email sessions securely). | Optional | Implemented |

---

## FUNC-002: Web Dashboard UI and Telemetry
**Total Requirements Count:** 6

| Requirement ID | Description | Priority | Status |
|---|---|---|---|
| **FUNC-002-001** | Render a real-time usage telemetry dashboard detailing total token consumption, invocation count, and active agent count. | Required | Implemented |
| **FUNC-002-002** | Provide an active Discord server selector dropdown in the header to filter dashboard statistics and scope agent telemetry. | Required | Implemented |
| **FUNC-002-003** | Display server-specific usage statistics (token consumption and invocation count) broken down per active agent. | Required | Implemented |
| **FUNC-002-004** | Provide an onboarding workflow that displays a "Create First Agent" view if the authenticated user has not created any agents. | Required | Implemented |
| **FUNC-002-005** | Render a user profile page displaying the user's name, avatar image, and a list of linked Discord servers. | Required | Implemented |
| **FUNC-002-006** | Provide a premium dark-themed responsive user interface featuring custom typography, a sidebar panel, and interactive elements. | Optional | Implemented |

---

## FUNC-003: Agent and Subagent Configuration
**Total Requirements Count:** 9

| Requirement ID | Description | Priority | Status |
|---|---|---|---|
| **FUNC-003-001** | Allow users to create top-level global agents with custom names and base system prompts. | Required | Implemented |
| **FUNC-003-002** | Allow users to create subagents under a specific parent global agent. | Required | Implemented |
| **FUNC-003-003** | Provide an inline system prompt editor allowing real-time edits and updates to system instructions for agents/subagents. | Required | Implemented |
| **FUNC-003-004** | Support renaming agents and subagents with a 5-second countdown safety confirmation dialog. | Required | Implemented |
| **FUNC-003-005** | Support deletion of agents and subagents with a 5-second countdown safety confirmation dialog. | Required | Implemented |
| **FUNC-003-006** | Implement prompt context inheritance, where a subagent automatically inherits and prepends its parent global agent's system prompt instructions. | Required | Implemented |
| **FUNC-003-007** | Support customizing the default Gemini model used by an agent (e.g. fallback to `gemini-flash-latest`). | Optional | Implemented |
| **FUNC-003-008** | Support customization of LLM generation temperature per agent. | Optional | Implemented |
| **FUNC-003-009** | Expose a REST API completion endpoint to request completions from specific agents and log invocation statistics under the dashboard. | Optional | Implemented |

---

## FUNC-004: RAG Context Engine
**Total Requirements Count:** 8

| Requirement ID | Description | Priority | Status |
|---|---|---|---|
| **FUNC-004-001** | Support file uploads of multiple file formats (including text, PDF, Markdown, and CSV) for agent reference context. | Required | Implemented |
| **FUNC-004-002** | Extract text from uploaded document bytes and split the content into overlapping, token-size discrete chunks. | Required | Implemented |
| **FUNC-004-003** | Generate high-dimensional vector embeddings for document chunks using the Gemini embedding API (e.g. `gemini-embedding-2`). | Required | Implemented |
| **FUNC-004-004** | Perform app-side cosine similarity vector search over stored document chunks to retrieve relevant context. | Required | Implemented |
| **FUNC-004-005** | Adaptively inject either the full document context if it falls under the token threshold or retrieve top-K retrieved chunks using RAG. | Required | Implemented |
| **FUNC-004-006** | Support context inheritance, allowing subagents to search and retrieve reference chunks from both their own document database and their parent agent's database. | Required | Implemented |
| **FUNC-004-007** | Implement auto-polling on the dashboard that queries the database every 3 seconds to check the processing status of uploaded documents. | Optional | Implemented |
| **FUNC-004-008** | Upgrade cosine similarity query search to native MariaDB/MySQL VECTOR columns with ANN indexing (`VEC_DISTANCE`). | Optional | Not started |

---

## FUNC-005: Discord Bot Integration
**Total Requirements Count:** 9

| Requirement ID | Description | Priority | Status |
|---|---|---|---|
| **FUNC-005-001** | Listen to guild channels and respond only when the bot client is directly mentioned (ignoring general messages and other bots). | Required | Implemented |
| **FUNC-005-002** | Enrich user queries with active Discord detail blocks including the author's username, roles, nickname, and other mentioned users' details. | Required | Implemented |
| **FUNC-005-003** | Provide a `/agent` slash command to bind a configured global agent to a Discord guild. | Required | Implemented |
| **FUNC-005-004** | Provide a `/subagent` slash command to bind a channel-specific subagent, overriding guild defaults. | Required | Implemented |
| **FUNC-005-005** | Provide a `/status` slash command showing telemetry, active agent names, model configurations, and ingested document counts. | Required | Implemented |
| **FUNC-005-006** | Provide an `/editagent` slash command opening a 3-field modal form to rename, describe, or update system prompts inside Discord. | Required | Implemented |
| **FUNC-005-007** | Provide a `/forget` slash command to clear recent conversation memory stored for a channel. | Required | Implemented |
| **FUNC-005-008** | Support splitting long AI responses exceeding 2000 characters into separate messages while preserving markdown boundaries (code blocks and blockquotes). | Required | Implemented |
| **FUNC-005-009** | Trigger a Discord typing indicator channel-state while generating and fetching completions. | Optional | Implemented |

---

## FUNC-006: Model Context Protocol (MCP) Integration
**Total Requirements Count:** 4

| Requirement ID | Description | Priority | Status |
|---|---|---|---|
| **FUNC-006-001** | Intercept incoming agent queries and identify if they relate to "queue" or "hermes" actions. | Required | Implemented |
| **FUNC-006-002** | Initialize a streamable HTTP connection to a Model Context Protocol (MCP) server (e.g. `http://localhost:9111`). | Required | Implemented |
| **FUNC-006-003** | Fetch available tools from the MCP server, expose them to the Gemini model as function declarations, and execute up to 5 tool-calling loop iterations. | Required | Implemented |
| **FUNC-006-004** | Call external tools via the connected MCP client transport and feed results back to the Gemini session context. | Required | Implemented |
