# LiveTranslate

## Overview

LiveTranslate is a mobile-first React Native application built with Expo that provides real-time speech transcription and translation for multi-speaker conversations. The app records audio, sends it to the server for transcription using AssemblyAI with speaker diarization, translates the transcribed text using OpenAI, and displays results with speaker-specific color coding. It supports 17+ languages and stores session history for later review.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54, using the new architecture
- **Navigation**: React Navigation v7 with native stack navigators and bottom tabs
- **State Management**: TanStack React Query for server state, React Context for auth
- **Styling**: StyleSheet-based theming with light/dark mode support following editorial design guidelines
- **Animations**: React Native Reanimated for smooth UI animations
- **Audio**: expo-av for recording audio on mobile devices

The client code lives in the `client/` directory with path aliases (`@/` for client, `@shared/` for shared code). The app structure uses stack navigators nested within a tab navigator, with a separate auth flow for unauthenticated users.

### Backend Architecture
- **Framework**: Express.js running on Node.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Schema**: Users, transcription sessions, and utterances tables with proper relations
- **Authentication**: JWT-based auth with bcrypt password hashing, tokens stored in expo-secure-store on mobile

The server handles audio file uploads via multer, processes them through AssemblyAI for transcription with speaker diarization, then translates using OpenAI. Results are stored in the database and returned to the client.

### Data Flow for Transcription
1. Client records audio using expo-av
2. Audio file uploaded to `/api/transcribe` endpoint
3. Server sends to AssemblyAI with speaker diarization enabled
4. Transcribed utterances translated via OpenAI
5. Results saved to database and returned to client
6. Client displays with speaker-specific color coding

### Key Design Decisions
- **Speaker Colors**: 5-color rotating palette for distinguishing up to 5 speakers visually
- **Confidence Indicators**: Low confidence words (< 0.7) displayed at 50% opacity
- **Session Storage**: Full transcription history persisted for review
- **Cross-Platform**: Single codebase for iOS, Android, and web via Expo

## External Dependencies

### APIs and Services
- **AssemblyAI**: Speech-to-text transcription with speaker diarization support
- **OpenAI**: Translation services via Replit AI Integrations (uses custom base URL)
- **PostgreSQL**: Primary database (requires DATABASE_URL environment variable)

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: JWT signing secret (defaults to dev value)
- `ASSEMBLYAI_API_KEY`: For transcription services
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key via Replit
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: Custom OpenAI endpoint

### Key npm Packages
- `assemblyai`: Official SDK for transcription
- `drizzle-orm` + `drizzle-zod`: Database ORM with Zod schema validation
- `expo-av`: Audio recording on mobile
- `expo-secure-store`: Secure token storage on native platforms
- `jsonwebtoken` + `bcryptjs`: Authentication utilities