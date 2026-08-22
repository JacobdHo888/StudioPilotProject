# StudioPilot Deployment Checklist & Guide

This guide outlines the steps to transition this prototype into a production-ready architecture using Google Cloud Run, Next.js, and Secret Manager, as required for the hackathon submission.

## 🏗️ Architecture Transition
Currently, this project runs as a client-side React SPA for rapid prototyping. For production:
1. **Backend (Python ADK):** Move the logic in `services/agentPipeline.ts` to a Python FastAPI/Flask app using the `google-adk` and `parallel-web` SDKs.
2. **Frontend (Next.js):** Port the React components (`App.tsx`, `ResultsDashboard.tsx`) to a Next.js application.
3. **Integration:** The Next.js frontend will call the Python backend via REST APIs.

## 🔐 Security & Secret Manager
1. Go to Google Cloud Console -> Security -> Secret Manager.
2. Create secrets for:
   - `GEMINI_API_KEY`
   - `PARALLEL_API_KEY`
3. Grant the Cloud Run service account `Secret Manager Secret Accessor` role.

## 🚀 Deployment Steps

### 1. Deploy Backend to Cloud Run
```bash
# Build and deploy the Python ADK backend
gcloud run deploy studiopilot-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,PARALLEL_API_KEY=PARALLEL_API_KEY:latest"
```

### 2. Deploy Frontend (Next.js)
```bash
# Deploy the Next.js dashboard (can also be deployed to Cloud Run or Vercel)
gcloud run deploy studiopilot-frontend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_BACKEND_URL=https://studiopilot-backend-xxx.a.run.app"
```

## ✅ Final Deployment Checklist

- [ ] **Public URLs Live:** Both Frontend and Backend Cloud Run services are deployed and accessible via HTTPS.
- [ ] **Backend Health:** The `/health` endpoint on the Python ADK backend returns `200 OK`.
- [ ] **Env Vars Wired:** The Next.js frontend successfully routes requests to the backend using the `NEXT_PUBLIC_BACKEND_URL` environment variable.
- [ ] **Secrets Secured:** No API keys are hardcoded in the repository. All keys are injected at runtime via Google Cloud Secret Manager.
- [ ] **Parallel Integration Firing:** Verified in Cloud Run Logs Explorer that the Python backend is making actual HTTP requests to the Parallel Search API (not using simulated mock data) and returning real-world constraints.
- [ ] **End-to-End Test:** The "Recheck Production" flow successfully triggers a new Parallel Search, diffs the results, and updates the UI.
