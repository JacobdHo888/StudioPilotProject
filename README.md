# StudioPilot

**An AI production coordinator that turns a screenplay into a living, continuously verified production plan.**

Built for [Agentic Cinema: The Blockbuster Hackathon](https://agentic-cinema.devpost.com/) — Parallel track.

## The Problem

Independent filmmakers and small production teams don't have a full production-management
department behind them. Turning a screenplay into an actionable shoot plan — figuring out
locations, scheduling dependencies, permit requirements, and risks — is manual, slow, and
goes stale the moment real-world conditions change (a permit gets denied, weather shifts,
a location becomes unavailable).

StudioPilot automates this: it reads a screenplay, builds a structured production plan,
verifies key details against current real-world information, flags risks with mitigation
strategies, and can re-check itself on demand to catch what's changed.

## How It Works

StudioPilot runs a five-agent pipeline, orchestrated with Google's Agent Development Kit (ADK):

1. **Script Analyst** — extracts scenes, characters, locations, props, timing, and
   dependencies from the screenplay using Gemini.
2. **Research Agent** — identifies which extracted details need real-world verification
   (locations, permits, weather, equipment) and retrieves current information using
   **Parallel's Search API**.
3. **Production Planner** — combines the screenplay analysis and research findings into
   an organized production plan.
4. **Risk Analyst** — evaluates the plan and flags risks (scheduling, safety, location,
   resource) with severity, affected scenes, and mitigation strategies. Risks can be
   marked Open / In Progress / Resolved and persist across sessions.
5. **Change Monitor** — powers **Recheck Production**: re-verifies previously researched
   facts, detects meaningful changes, identifies which scenes/plan elements are affected,
   proposes an updated plan, and reopens any previously "Resolved" risk whose underlying
   condition has changed.

All agent activity, research findings, production plans, and risks are surfaced in a
dedicated production dashboard — not a chat interface.

## Where the Integrations Actually Run

- **Gemini / Google ADK**: [`backend/agents/`](./backend/agents) — each agent is defined
  and orchestrated here using `google-adk` / `google-genai`.
- **Parallel Search API**: [`backend/tools/parallel_search.py`](./backend/tools/parallel_search.py)
  (adjust path to match your actual file) — wraps the `parallel-web` SDK as a tool called
  by the Research Agent and the Change Monitor.

## Tech Stack

- **Google Gemini** — reasoning for screenplay analysis, planning, and risk analysis
- **Google Agent Development Kit (ADK)** — multi-agent orchestration
- **Parallel Search API** — live, traceable web research for production verification
- **Google Cloud Run** — hosting
- **Next.js** — production dashboard frontend

## Running Locally

### Prerequisites
- [Google Cloud SDK / gcloud CLI](https://cloud.google.com/sdk/docs/install)
- Node.js and npm
- A Parallel API key ([parallel.ai](https://parallel.ai))

### Setup
```bash
gcloud init
gcloud auth application-default login
```

Create `backend/.env.local` with:
GOOGLE_CLOUD_PROJECT=<your-gcp-project-id>
GOOGLE_CLOUD_LOCATION=<your-gcp-region>
PARALLEL_API_KEY=<your-parallel-api-key>
API_BACKEND_PORT=5000
API_PAYLOAD_MAX_SIZE=5mb

### Install and run
```bash
npm install && npm run dev
```

## Live Demo

[Add your hosted Cloud Run / dashboard URL here]

## License

See [LICENSE](./LICENSE).
