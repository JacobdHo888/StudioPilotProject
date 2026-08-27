# FrictionForge - Taskmaster

## Problem Statement
For freelancers, contractors, and gig workers, incoming tasks are scattered across a chaotic inbox of automated platform notifications, direct client emails, and vague requests. Manually parsing these emails to extract deadlines, calculate expected pay, update personal ledgers, and block out calendar time is a high-friction, error-prone administrative burden. FrictionForge solves this by acting as an automated, event-sourced night dispatcher: it intercepts incoming task emails, adversarially verifies the extracted details to prevent AI hallucinations, securely updates a central ledger, and stages calendar events and draft replies—all without requiring manual data entry.

## Architecture
FrictionForge abandons the brittle, linear "try/catch" pipeline in favor of an event-sourced dispatch model built on Google Cloud and the Agent Development Kit (ADK). Agents communicate by writing immutable events to a central Firestore shift log.

*   **Triage Filter (Gemma):** A lightweight first-pass model that evaluates incoming emails to determine if they are actual task assignments or just platform noise/newsletters. If it's noise, the pipeline halts immediately, saving the cost and latency of invoking the heavier Gemini 3.5 Extractor.
*   **Extractor Agent:** Triggered by a Gmail Pub/Sub push. Uses Gemini 3.5 via Vertex AI to parse the raw email into a strict JSON schema (`task_type`, `platform`, `deadline`, `pay_amount`, `pay_currency`).
*   **Verifier Agent:** Operates independently. It takes the Extractor's output and the original email, acting as an adversarial check. It specifically looks for hallucinated numbers, misattributed dates, or platform mix-ups. It outputs `CONFIRMED`, `NEEDS_REVIEW`, or `REJECTED`.
*   **Ledger Tool:** Only reacts to `CONFIRMED` events. Uses Firestore transactions to atomically update the specific platform's running totals (tasks completed, pending pay, confirmed pay) to prevent race conditions.
*   **Action Tools (Isolated & Scoped):**
    *   **CalendarTool:** Reacts to `CONFIRMED` events. Uses a narrowly scoped `calendar.events` credential to block out time 2 hours before the deadline.
    *   **DraftComposerTool:** Reacts to `CONFIRMED` events. Uses a strictly scoped `gmail.compose` credential to create a draft acknowledgment. It physically cannot call `messages.send`, ensuring a human always remains in the loop.
*   **Digest Agent:** Triggered by a Cloud Scheduler cron job. Queries Firestore for the last 24 hours of activity, the review queue, and reconciled ledger totals, using Gemini to write a plain-English daily briefing.

## Spin-up Instructions

### 1. Google Cloud Project Setup
```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
    run.googleapis.com \
    firestore.googleapis.com \
    pubsub.googleapis.com \
    cloudscheduler.googleapis.com \
    aiplatform.googleapis.com \
    gmail.googleapis.com \
    calendar-json.googleapis.com \
    cloudtrace.googleapis.com
```

### 2. Service Account & IAM
```bash
# Create the service account
gcloud iam service-accounts create frictionforge-sa \
    --display-name="FrictionForge Service Account"

export SA_EMAIL="frictionforge-sa@$PROJECT_ID.iam.gserviceaccount.com"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/datastore.user"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/cloudtrace.agent"
```

### 3. Deploy to Cloud Run
```bash
# Deploy the ADK FastAPI orchestrator
gcloud run deploy frictionforge-orchestrator \
    --source . \
    --region us-central1 \
    --service-account $SA_EMAIL \
    --set-env-vars="PROJECT_ID=$PROJECT_ID,LOCATION=us-central1" \
    --allow-unauthenticated

export RUN_URL=$(gcloud run services describe frictionforge-orchestrator --region us-central1 --format='value(status.url)')
```

### 4. Pub/Sub & Scheduler Wiring
```bash
# Create Pub/Sub topic and push subscription for Gmail
gcloud pubsub topics create gmail-intercepts
gcloud pubsub subscriptions create gmail-push-sub \
    --topic=gmail-intercepts \
    --push-endpoint="$RUN_URL/webhook/pubsub" \
    --push-auth-service-account=$SA_EMAIL

# Create Cloud Scheduler Cron for the Digest Agent (Runs daily at 8 AM)
gcloud scheduler jobs create http daily-digest-cron \
    --schedule="0 8 * * *" \
    --uri="$RUN_URL/trigger/digest" \
    --http-method=POST \
    --oidc-service-account-email=$SA_EMAIL
```

### 5. Local Fixture Replay
To test the pipeline end-to-end locally without sending real emails:
```bash
python test_trigger.py --fixture clean_task
python test_trigger.py --fixture tricky_task
python test_trigger.py --fixture noise
```

## Reproducibility Note
This project relies on active Gmail watch subscriptions and specific Google Workspace configurations. It does not need to remain live for judging. A complete set of screenshots, Cloud Trace exports, and execution logs from a real run are included in the `/proof/` directory of this repository.

---

## Devpost Submission Text

**Features and Functionality**
FrictionForge is an event-sourced AI dispatch system that automates the administrative overhead of freelance and gig work. Instead of a brittle, linear script, it uses an asynchronous shift-log architecture. When an email arrives, a lightweight Gemma triage filter first checks if it's a real task or just noise, saving costs. If it passes, an Extractor agent pulls structured data. Crucially, a separate Verifier agent adversarially checks this data against the source text to catch AI hallucinations (like invented pay rates or wrong deadlines). If confirmed, isolated tools securely update a Firestore ledger, draft a Gmail reply (without sending it), and block out Google Calendar time. Anomalies are routed to a human review queue. A daily cron job generates a plain-English digest of the day's ledger and pending reviews.

**Technologies Used**
*   **Google ADK (Python) & FastAPI:** Core agent orchestration and webhook handling.
*   **Vertex AI (Gemini 3.5 Flash & Gemma):** Powers the Triage, Extractor, Verifier, and Digest agents.
*   **Google Cloud Run:** Serverless, scalable hosting for the webhook endpoints.
*   **Cloud Pub/Sub & Cloud Scheduler:** Event ingestion and cron triggering.
*   **Firestore:** Acts as the immutable event log and transactional ledger.
*   **Cloud Trace (OpenTelemetry):** Provides granular, per-span observability into the agent reasoning chain.
*   **React & Tailwind (Frontend):** A custom dispatch console to visualize the event stream and review queue.

**Data Sources**
The system ingests raw email payloads via Gmail API push notifications (simulated via Pub/Sub for the hackathon scope) and interacts with Google Calendar and Firestore.

**Findings and Learnings**
Our biggest learning was that single-pass LLM extraction is too unreliable for financial or scheduling data. By splitting the architecture into an Extractor and an adversarial Verifier, accuracy skyrocketed. Furthermore, moving from a sequential script to an event-sourced dispatch model made error handling trivial: if the Calendar API rate-limits, the task simply logs an `ACTION_FAILED` event, but the Ledger and Draft steps remain perfectly intact. Adding a lightweight Gemma model at the very front of the pipeline also proved to be a highly effective cost-control measure against inbox noise.

---

## 4-Minute Demo Video Script

**[0:00 - 0:45] The Problem & Architecture**
*(Visual: Screen recording of a messy inbox full of Upwork, Fiverr, and direct client emails. Mouse scrolling through them.)*
"If you do freelance or gig work, your inbox looks like this. A chaotic mix of automated platform notifications and vague client emails. Manually reading these to figure out when things are due, how much you're getting paid, and updating your calendar is a massive friction point. 

*(Visual: Switch to a clean, dark-mode architecture diagram.)*
FrictionForge solves this. But instead of a brittle, linear script, we built an event-sourced dispatch system using the Google Agent Development Kit. When an email hits our Cloud Run endpoint, a lightweight Gemma model acts as a first-pass filter to drop newsletters and noise, saving costs. If it's a real task, an Extractor agent pulls the data using Gemini 3.5. Then, a completely separate Verifier agent adversarially checks that data against the source to catch hallucinations. If it passes, narrowly scoped tools update a Firestore ledger, draft an email reply, and create a Calendar event."

**[0:45 - 2:15] Live Run 1: The Happy Path**
*(Visual: Split screen. Left side is the FrictionForge React Dispatch Console. Right side is a terminal running the test_trigger.py script.)*
"Let's run it live. I'm firing a simulated Pub/Sub push notification containing a standard Upwork task email. 

*(Visual: Console lights up with events. Point out the specific logs as they appear.)*
Instantly, we see the event hit the shift log. The Triage filter passes it. The Extractor pulls the deadline and the fifty-dollar pay amount. The Verifier double-checks the source text, confirms the fifty dollars is real, and issues a `CONFIRMED` verdict. 

Because it's confirmed, our Ledger Tool uses a Firestore transaction to update our running totals—you can see the 'Tasks Confirmed' jump up on the right. Simultaneously, our Calendar Tool blocks out time two hours before the deadline, and our Draft Composer stages a reply in Gmail. Notice it only *drafts* the email; the credential scope physically prevents the AI from hitting send, keeping a human in the loop."

**[2:15 - 3:00] Live Run 2: The Adversarial Catch & Noise Filter**
*(Visual: Terminal again. Firing the 'tricky' fixture, then the 'noise' fixture.)*
"Now, let's send a tricky email. This one mentions a thousand-dollar client budget, but the actual freelancer cut is only one-fifty, and the dates are contradictory.

*(Visual: Console shows the Extractor event, then a red Verifier event, then a Watchdog event.)*
The Extractor gets confused and grabs the thousand-dollar number. But look at the Verifier. It reads the source, catches the discrepancy, and issues a `REJECTED` verdict. Because of our event-sourced architecture, the Ledger and Calendar tools simply ignore this task. Instead, a Watchdog agent catches the rejection and drops it safely into our manual Review Queue on the right. And if we send a marketing newsletter, the Gemma triage filter catches it immediately and halts the pipeline, saving us a Gemini call."

**[3:00 - 4:00] Observability & Outro**
*(Visual: Click on the Trace ID badge in the console, opening the Trace Viewer modal, then switch to the actual Google Cloud Trace console in a browser tab.)*
"Because we instrumented the ADK with OpenTelemetry, we have complete observability. Here in Cloud Trace, we can see the exact reasoning chain for that specific email, span by span, showing exactly how long Gemini took to extract versus verify.

*(Visual: Switch to Google Cloud Run dashboard showing active revisions and traffic, then to the Daily Digest text.)*
This is all running live on Google Cloud Run, securely locked down with IAM service accounts. Finally, instead of checking dashboards all day, a Cloud Scheduler cron triggers our Digest Agent every morning, using Gemini to read the Firestore ledger and give me a plain-English summary of what's due, what's paid, and what needs my review. That's FrictionForge."
