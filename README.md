# Meeting Prep Agent
> *"From meeting conversations to accountable action."*

An intelligent, context-aware meeting lifecycle agent that remembers previous meetings, synthesizes historical context to prepare users before upcoming meetings, extracts structured Minutes of Meeting (MOM), decisions, and action items from transcripts, and turns conversations into tracked individual tasks with a memory-grounded AI assistant.

---

## 1. Core Product Vision & The Loop

Most meeting tools stop at audio transcription and surface-level summaries. **Meeting Prep Agent** solves the accountability gap with an ongoing memory loop:

```
REMEMBER
   ↓
PREPARE (Historical context, decisions, pending commitments, suggested questions)
   ↓
MEET
   ↓
UNDERSTAND (Mistral AI analysis, structured MOM, consensus detection)
   ↓
ASSIGN (Ambiguity checks, confidence scores, organizer confirmation)
   ↓
TRACK (Individual persona dashboards, deadline notifications)
   ↓
REMEMBER AGAIN (Organizational memory queryable by chatbot)
```

---

## 2. 8-Step Hackathon Demo Story

The app has built-in persona switching and seed data to run this exact live evaluation:

1. **Step 1 - Team & Participants**: Default workspace **Project Alpha** with members **Maroof** (Lead), **Ayesha** (Designer), **Rahul** (API Specialist), and **Sarah** (QA).
2. **Step 2 - Previous Meeting in Memory**: "Project Alpha Planning" where the team agreed on REST APIs, PostgreSQL, and commitments were made by Rahul (API testing), Ayesha (UI prototype), and Maroof (Deployment docs).
3. **Step 3 - Upcoming Meeting & "Prepare Me"**: Open "Project Alpha Progress Review" and click **"Prepare Me"**. The agent retrieves historical records and generates the Executive Meeting Brief with previous decisions, pending commitments, overdue items, discussion topics, and suggested accountability questions.
4. **Step 4 - Input Sample Transcript**: Paste the transcript:
   > *"We discussed the API integration. Rahul confirmed that API testing will be completed by Monday. Ayesha will finish the dashboard prototype by Friday. The team decided to use REST APIs. Maroof will prepare deployment documentation by Wednesday."*
5. **Step 5 - "Generate MOM"**: Click **"Generate MOM"**. Mistral AI structures the summary, discussion points, decisions, and action items with individual owners, deadlines, priorities, and confidence scores (e.g. 98%).
6. **Step 6 - "Create Tasks"**: Review action items (confirm/edit/reject) and click **"Create All Tasks"**. The system creates persistent tasks and delivers notifications to Rahul, Ayesha, and Maroof.
7. **Step 7 - Persona Dashboard Isolation**: Use the top demo switcher to switch between Maroof, Ayesha, Rahul, and Sarah. Each user only sees their own assigned deliverables on their personal dashboard and task board!
8. **Step 8 - Context-Aware Chatbot Assistant**: Open the Assistant and ask:
   - *"What did we decide about the API?"* → Answers with REST API decision from Project Alpha Planning.
   - *"What are my pending tasks?"* → Retrieves the authenticated user's actual tasks.
   - *"What did Rahul commit to?"* → Cites Rahul's API testing deliverable.
   - *"What should I discuss in tomorrow's meeting?"* → Cross-references pending commitments with upcoming agenda.

---

## 3. Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, Lucide Icons, Motion.
- **Backend**: Node.js, Express, TypeScript, RESTful API architecture.
- **Data & Storage Layer**: Local JSON persistence in `data/database.json`; the Drizzle schema and Neon migration are not currently wired into the runtime store.
- **AI Engine**: Server-side Groq for chatbot responses, Mistral for meeting preparation and MOM generation, and AssemblyAI for audio transcription.
- **Security & Auth**: Cryptographically signed token sessions, user isolation, and backend-only AI credentials.

---

## 4. Environment Variables

Create `.env` using `.env.example`:

```env
# Required: use a unique random secret of at least 32 characters
JWT_SECRET="replace-with-a-random-secret-at-least-32-characters"

# Optional: Set Mistral AI API key for Mistral models
MISTRAL_API_KEY="your-mistral-api-key"
MISTRAL_MODEL="mistral-small-latest"

# Server-side chatbot provider
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="llama-3.3-70b-versatile"

# Optional: Enable demo login/persona switching only for local development
DEMO_AUTH_ENABLED="true"
VITE_DEMO_AUTH_ENABLED="true"

# Optional: AssemblyAI transcription
ASSEMBLYAI_API_KEY="your-assemblyai-api-key"

# Server Port
PORT=3000

# App URL
APP_URL="http://localhost:3000"
```

---

## 5. Running the Application

```bash
# Install dependencies
npm install

# Start development full-stack server (runs on port 3000)
npm run dev

# Build for production
npm run build
npm start
```

---

## 6. API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Email/password or quick demo login |
| `POST` | `/api/auth/switch-user` | Fast persona switcher for demo evaluation |
| `GET` | `/api/meetings` | List meetings with participant resolution |
| `POST` | `/api/meetings/:id/prepare` | **Meeting Preparation Agent**: generates executive brief |
| `POST` | `/api/meetings/:id/generate-mom` | **MOM Agent**: parses transcript into structured MOM & actions |
| `POST` | `/api/meetings/:id/create-tasks` | Converts confirmed action items into individual tasks |
| `GET` | `/api/tasks/my` | Retrieves tasks assigned specifically to current persona |
| `POST` | `/api/chat` | Context-grounded assistant with memory citation sources |
| `POST` | `/api/demo/reset` | Resets database to original demo state |
