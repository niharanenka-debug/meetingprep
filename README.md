Meeting Agent is an AI-powered meeting productivity platform that transforms meeting conversations into structured, actionable outcomes. Upload a meeting recording, generate an editable transcript, create AI-powered Minutes of Meeting (MOM), extract decisions and action items, assign tasks, and interact with an AI meeting assistant.

✨ Features
🎙️ Audio Transcription

Upload meeting recordings such as MP3, WAV, or M4A and automatically generate a transcript using AssemblyAI.

📝 Editable Meeting Transcript

Review and edit the generated transcript before using it for AI analysis.

🤖 AI-Powered MOM

Generate structured meeting outcomes using Mistral AI, including:

Meeting summary
Discussion points
Decisions
Commitments
Action items
Unresolved issues
Follow-ups
✅ Task Management

Convert approved action items into individual tasks with:

Assignee
Deadline
Priority
Status
Meeting context
💬 AI Meeting Chatbot

Ask questions about your meetings using Groq.

Example questions:

What did we decide about the project?

What are my pending tasks?

Which commitments are overdue?

What did Rahul commit to?

What changed since our previous meeting?

What should we discuss in the next meeting?

The chatbot uses authorized meeting context rather than functioning as a generic chatbot.

🧠 Meeting Memory

Meeting Agent maintains useful context across meetings, helping teams keep track of:

Previous decisions
Commitments
Open issues
Follow-ups
Important discussion points
📋 Meeting Preparation

Prepare for upcoming meetings using information from previous meetings, pending tasks, commitments, and unresolved issues.

🔐 Authentication & Authorization

Firebase Authentication provides user authentication, while protected backend APIs control access to application data.

🗄️ Persistent Storage

Meeting data, transcripts, tasks, decisions, commitments, and related information are stored using Neon PostgreSQL.

🏗️ Architecture
                    ┌──────────────────┐
                    │   React Frontend │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Node / Express │
                    │      Backend     │
                    └────────┬─────────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
      ┌────────────┐  ┌────────────┐  ┌────────────┐
      │   Firebase │  │    Neon    │  │  AI APIs   │
      │    Auth    │  │ PostgreSQL │  │            │
      └────────────┘  └────────────┘  └─────┬──────┘
                                             │
                          ┌──────────────────┼─────────────────┐
                          ▼                  ▼                 ▼
                    ┌───────────┐      ┌───────────┐    ┌───────────┐
                    │ AssemblyAI│      │  Mistral  │    │   Groq    │
                    │Transcript │      │ MOM / AI  │    │ Chatbot   │
                    └───────────┘      └───────────┘    └───────────┘
🔄 Core Workflow
Create Meeting
      │
      ▼
Upload Audio
      │
      ▼
AssemblyAI Transcription
      │
      ▼
Editable Transcript
      │
      ▼
Generate MOM & Actions
      │
      ▼
Mistral AI
      │
      ├── Summary
      ├── Decisions
      ├── Commitments
      ├── Action Items
      └── Issues
             │
             ▼
       Review & Approve
             │
             ▼
        Create Tasks
             │
             ▼
       Track Progress
             │
             ▼
     Meeting Memory
             │
             ▼
      Groq AI Assistant
🛠️ Tech Stack
Layer	Technology
Frontend	React + TypeScript
Backend	Node.js + Express
Database	Neon PostgreSQL
ORM	Drizzle ORM
Authentication	Firebase
Transcription	AssemblyAI
Meeting AI	Mistral AI
Chatbot	Groq
API	REST
Configuration	Environment Variables
🚀 Getting Started
1. Clone the repository
git clone <your-repository-url>
cd meeting-agent
2. Install dependencies
npm install
3. Configure environment variables

Create a .env file:

DATABASE_URL=""

MISTRAL_API_KEY=""
MISTRAL_MODEL=""

GROQ_API_KEY=""
GROQ_MODEL=""

ASSEMBLYAI_API_KEY=""

FIREBASE_PROJECT_ID=""
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""

VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""

Never commit .env to Git.

Use .env.example for sharing the required configuration structure.

🗃️ Database Setup

Make sure your Neon PostgreSQL database is available and configure:

DATABASE_URL="your-neon-database-url"

Run the project's database migration commands as defined in package.json.

For example, if the project uses Drizzle Kit:

npm run db:migrate

Use the actual database scripts provided by the project.

🔥 Firebase Setup

Create a Firebase project and enable the authentication provider required by the application.

Configure the Firebase client variables:

VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""

For backend authentication verification:

FIREBASE_PROJECT_ID=""
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""

Firebase Admin credentials must remain server-side.

🤖 AI Services
Mistral

Mistral handles meeting intelligence such as:

Transcript
    ↓
Mistral
    ↓
MOM
Decisions
Commitments
Action Items
Issues
Groq

Groq powers the interactive meeting chatbot:

User Question
      ↓
Authorized Meeting Context
      ↓
Groq
      ↓
AI Response
AssemblyAI

AssemblyAI converts meeting recordings into text:

Audio
  ↓
AssemblyAI
  ↓
Transcript
  ↓
Editable Meeting Notes
▶️ Running the Application

Start the development server:

npm run dev

Then open the local URL displayed by the development server.

🧪 Validation

Run the available project checks:

npm run typecheck
npm run lint
npm test
npm run build

The exact commands depend on the scripts configured in package.json.

🔒 Security

Meeting Agent is designed with several security principles:

API keys remain on the backend.
Firebase handles authentication.
Backend APIs verify authenticated users.
Database records are associated with users/teams.
Frontend code does not directly call Mistral, Groq, or AssemblyAI with secret keys.
.env should never be committed.
User-provided IDs should not be trusted as proof of ownership.
AI-generated information should be validated before becoming application data.

If an API key has previously been exposed, revoke and regenerate it.

📁 Project Structure

A typical structure is:

meeting-agent/
│
├── client/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── ...
│
├── server/
│   ├── routes/
│   ├── services/
│   │   ├── mistralService.ts
│   │   ├── groqService.ts
│   │   └── transcriptionService.ts
│   ├── middleware/
│   ├── db/
│   └── ...
│
├── shared/
│
├── migrations/
│
├── .env.example
├── .gitignore
├── package.json
└── README.md

The exact structure may vary depending on the implementation.

🎯 Project Goals

Meeting Agent focuses on closing the gap between:

What was discussed → What was decided → Who needs to act → What happened afterward

Instead of treating meetings as isolated conversations, the platform turns them into persistent, searchable, and actionable knowledge.
