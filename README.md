# Real-Time AI Meeting Copilot

## Stack
- Frontend: React + Tailwind + Vite
- Backend: Node.js + Express
- AI APIs: Groq Whisper Large V3 + GPT-OSS 120B (via settings key or env)

## Project Structure
- /frontend
- /backend

## Run
1. Backend
   - `cd backend`
   - `npm install`
   - copy `.env.example` to `.env` and optionally add `GROQ_API_KEY`
   - `npm run dev`

2. Frontend
   - `cd frontend`
   - `npm install`
   - `npm run dev`

Frontend runs on `http://localhost:5173` and backend on `http://localhost:8080`.

## API Routes
- `POST /api/transcribe`
- `POST /api/suggestions`
- `POST /api/chat`

## Notes
- App works without API key using realistic fallbacks.
- Add Groq API key in UI Settings to enable live Groq responses.
