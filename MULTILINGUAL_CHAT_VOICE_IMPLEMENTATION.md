# RootForge Platform — Multilingual Chat & Voice Architecture Implementation

## Executive Summary
This document provides the authoritative implementation and engineering specification for the production-grade Multilingual AI Consultant Chat, Voice Input (STT), and Text-to-Speech (TTS) engine across English (`en`), Gujarati (`gu`), and Hindi (`hi`) within the RootForge Solution Builder Enterprise Platform.

---

## 1. Canonical Language State Architecture

### 1.1 Single Source of Truth
The platform enforces a single canonical language state across all enterprise pages, drawers, inputs, voice recognizers, and text-to-speech synthesizers.
- **Provider:** [`frontend/src/context/LanguageContext.jsx`](file:///e:/Project/rootforge%202/rootforge/frontend/src/context/LanguageContext.jsx)
- **State Identifier:** `lang` (`'en'` | `'gu'` | `'hi'`)
- **Persistence:** Synchronized with `localStorage.getItem('aisb_lang')`.
- **Consumers:**
  - `DiscoveryPage`
  - `AiConsultantDrawer`
  - `ChatVoiceInput`
  - `ChatMessageSpeaker`
  - `StructuredConsultantCard`
  - `useChatTranslation`

### 1.2 Deterministic Synchronization Sequence
When the user toggles the global application language selector:
1. `changeLanguage(newLang)` in `LanguageContext` triggers.
2. `speechManager.stop()` immediately interrupts any active speech synthesis and resets UI playback indicators.
3. `localStorage` is updated synchronously.
4. `useChatTranslation` detects the language transition, checks the in-memory cache, and batch-requests translations for uncached visible messages.
5. `ChatVoiceInput` immediately switches its Web Speech API recognition locale (`en-US`, `gu-IN`, `hi-IN`).
6. `ChatMessageSpeaker` targets the new language locale and voice synthesizer.
7. Subsequent user questions sent to `/api/workspaces/:id/chats/:chatId/messages` carry the newly selected `language` parameter.

---

## 2. Chat Message Data Model & Zero-Drift Translation Layer

### 2.1 Preserving Canonical Message Records
Original messages stored in SQLite via Prisma (`prisma.message`) are **never mutated** upon translation:
```prisma
model Message {
  id                String       @id @default(cuid())
  conversationId    String
  role              String       // user, assistant, system
  content           String       // Canonical original text (immutable)
  structuredContent String?      // Canonical original JSON payload (immutable)
  suggestedAction   String?
  clientRequestId   String?
  createdAt         DateTime     @default(now())
}
```

### 2.2 Translation as a Pure Presentation Layer
Translation is implemented as a memoized, client-side presentation layer via [`frontend/src/hooks/useChatTranslation.js`](file:///e:/Project/rootforge%202/rootforge/frontend/src/hooks/useChatTranslation.js):
- **English Restoration:** When navigating `English -> Gujarati -> Hindi -> English`, the presentation layer returns `msg.content` directly with zero network calls and zero translation drift.
- **Single-Request Batch Translation:** Uncached visible messages are batched into a single POST request (`/api/workspaces/:id/chats/translate`). No N+1 query patterns.
- **In-Memory Cache:** Both frontend and backend maintain an in-memory cache keyed by `${messageId}_${targetLanguage}`, returning cached translations in under 5ms.

---

## 3. Structured AI Response Translation & Schema Protection

### 3.1 Contract Preservation
The backend localization engine ([`backend/src/services/translation.service.js`](file:///e:/Project/rootforge%202/rootforge/backend/src/services/translation.service.js)) strictly isolates structural keys from human-readable values:
- **Preserved Structural Keys:** `summary`, `status`, `confirmedFacts`, `inferences`, `requirements`, `recommendations`, `openQuestions`, `sources`, `suggestedNextAction`, `classification`, `businessArea`, `category`.
- **Translated Values:** Only human-readable prose (summaries, fact strings, inference rationale, requirement statements, recommendation titles/details).
- **Intact Identifiers:** Technical acronyms (`FHIR`, `REST`, `PostgreSQL`, `Redis`, `SMS`, `WhatsApp`, `API`, `EHR`, `HL7`, `OAuth2`), numbers, percentages (`60%`), and document filenames (`MediCare_Appointment_BRD.pdf`) are strictly shielded from alteration.

### 3.2 UI Component Localization
[`frontend/src/components/ai/StructuredConsultantCard.jsx`](file:///e:/Project/rootforge%202/rootforge/frontend/src/components/ai/StructuredConsultantCard.jsx) binds all section badges and labels to dynamic localized dictionary entries:
- Inferences & Logical Deductions: `અનુમાન અને તાર્કિક તારણો` (GU) / `अनुमान और तार्किक निष्कर्ष` (HI)
- Requirements Elicited: `મેળવેલ જરૂરિયાતો` (GU) / `प्राप्त आवश्यकताएं` (HI)
- Proposed Recommendations: `પ્રસ્તાવિત ભલામણો` (GU) / `प्रस्तावित सिफारिशें` (HI)
- Open Questions: `ખુલ્લા પ્રશ્નો અને ખૂટતી માહિતી` (GU) / `खुले प्रश्न और अनुपलब्ध जानकारी` (HI)
- Document Citations: `દસ્તાવેજ સંદર્ભો અને ટ્રેસેબિલિટી` (GU) / `दस्तावेज़ उद्धरण और ट्रैसेबिलिटी` (HI)

---

## 4. Voice Input (Speech-to-Text) Architecture

### 4.1 Speech Recognition Engine
[`frontend/src/components/ai/ChatVoiceControl.jsx`](file:///e:/Project/rootforge%202/rootforge/frontend/src/components/ai/ChatVoiceControl.jsx) provides a 6-state speech recognition controller:
- **BCP-47 Locale Mapping:**
  - `en` -> `en-US`
  - `gu` -> `gu-IN`
  - `hi` -> `hi-IN`
- **State Machine:**
  1. `idle`: Displays accessible microphone button with localized title.
  2. `starting`: Initializing audio hardware.
  3. `listening`: Active audio stream with visual pulse animation, Stop control, and localized status tag.
  4. `processing`: Transcribing recognized speech.
  5. `permissionDenied`: Clear localized warning tag (`માઇક્રોફોનની પરવાનગી જરૂરી છે.` / `माइक्रोफ़ोन की अनुमति आवश्यक है।`).
  6. `error`: Non-blocking retry alert.
- **Continuous Buffer Concatenation:** Iterates through cumulative `event.results` to guarantee zero loss of early phrases.
- **Silence Watchdog:** Automatically finalizes after 2.8s of sustained silence after speech.

---

## 5. Speaker / Text-to-Speech (TTS) Architecture

### 5.1 Global Speech Manager (`GlobalSpeechManager`)
To eliminate overlapping playback and guarantee complete speech synthesis:
- **Global Interruption:** Single active audio controller. Clicking another message, switching tabs, changing language, or navigating workspaces cancels any active utterance immediately (`window.speechSynthesis.cancel()`).
- **Synchronized Playback State:** Only the currently playing message displays `⏹ Stop`. All other messages display `🔊 Listen`.
- **Dedicated Extraction Function:** `getSpeakableMessageText(messageOrData, language)` synthesizes:
  - Direct summary
  - Confirmed facts with localized section header
  - Inferences with localized section header
  - Requirements with localized section header
  - Recommendations with localized section header
  - Open questions with localized section header
  - Eliminates markdown headers, bold/italic asterisks, backticks, JSON syntax, internal badges (`[DOCUMENT_FACT]`), and raw UUIDs.
- **Safe Sentence Chunking:** `splitIntoSpeakableChunks(text)` breaks sentences at punctuation boundaries (`. ! ? । ॥ \n`) and clauses to ensure Chromium/Edge speech synthesis engines never freeze on long responses.
- **Voice Selection:** Matches system voices matching `gu-IN`, `hi-IN`, or language prefix tags, falling back gracefully if no language pack is installed.

---

## 6. Security & Credential Isolation

1. **Zero Client Exposure:** No Google Gemini API keys, tokens, or credentials are built into or transmitted to the client bundle.
2. **Backend Gateway:** All translations and AI inferences route through authenticated backend controllers (`/api/workspaces/:id/chats/*`).
3. **RBAC & Tenant Isolation:** Workspace and stage chat sessions remain strictly isolated by workspace ID and stage key; cross-tenant and cross-stage queries are rejected with HTTP 403/404.
