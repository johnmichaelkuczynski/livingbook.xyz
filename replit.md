# Living Book Creator

## Overview

Living Book Creator is a web application designed for streamlined document processing and AI-powered contextual analysis. Its core purpose is to enable users to upload documents, select specific text passages, and interact with an AI to ask questions and perform various operations on their selections. The application focuses on essential text selection workflows, providing tools for study, content generation (like podcasts and rewrites), and advanced analytical features.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**December 5, 2025**:
- ✅ **Added Position Statement Generator (7th button)**: Generates numbered list of core philosophical claims without quotations
- ✅ **Added Position Statement with Quotes Generator (8th button)**: Same as above but includes direct quotations from text as evidence
- ✅ Created backend endpoints (/api/position-statement and /api/position-statement-quotes) with all 5 AI providers
- ✅ Created PositionStatementModal component with blockquote rendering for quoted content
- ✅ Added Positions and Positions+Quotes buttons to Whole Document Actions
- ✅ Implemented handler functions with loading states, error handling, and toast notifications
- ✅ **Fixed UI layout issue**: Reorganized ChatInterface to prevent "Document Chat" and "AI Assistant" labels from overlapping document text
- ✅ Added clear visual separation (gray background, blue border) for chat section below document viewer
- ✅ Removed redundant nested Card structure in ChatInterface component for cleaner layout

**December 2, 2025**:
- ✅ **Added ZHI 5 (Grok) as AI provider**: Integrated xAI's Grok model as the fifth LLM option
- ✅ Created server/services/grok.ts service following same pattern as other AI providers
- ✅ Added ZHI 5 tier pricing structure to backend
- ✅ Updated all AI provider switch statements across routes.ts (chat, study guide, podcast, test, rewrite, synthesize, etc.)
- ✅ Added ZHI 5 option to all frontend provider dropdowns (ChatInterface, TextSelectionPopup, RewritePanel, compare page, home page)

**October 21, 2025**:
- ✅ **Fixed Rewrite function in two-document mode**: Backend endpoint now accepts selectedText without requiring valid documentId, enabling rewrite to work in both single and two-document comparison modes
- ✅ **Synthesize function completely redesigned**: Now generates NEW ORIGINAL CREATIVE WORKS that combine both documents, not analytical comparisons. Creates mashups like "A Christmas Carol" + "The Republic" → Platonic dialogue about Scrooge's moral education
- ✅ **Automatic two-document podcast consolidation**: Eliminated manual consolidation step. Clicking "Podcast" in two-document mode now automatically consolidates and opens podcast generation in one step
- ✅ Verified all backend endpoints properly accept selectedText for two-document operations
- ✅ Improved error logging in SynthesizeDocumentsModal for better debugging

**September 30, 2025**:
- ✅ **Phase 1-3 COMPLETE**: Full credit tracking and payment infrastructure
- ✅ Implemented user authentication system with optional login (no password wall)
- ✅ Created credit tracking infrastructure with ZHI pricing tiers (4 tiers: $5-$100)
- ✅ Added credit display in header and purchase UI with real-time balance updates
- ✅ Backend credit management routes (/api/credits/add, /api/credits/deduct, /api/credits/transactions)
- ✅ **Credit deduction fully integrated** into AI chat operations (1 credit per word)
- ✅ Authorization Bearer tokens in API requests for authenticated users
- ✅ Real-time credit updates in header after each AI interaction
- ✅ Error handling for insufficient credits with user-friendly messages
- ✅ **Stripe payment system with runtime loading**: Refactored to load Stripe dynamically at payment time instead of module-level, preventing browser caching issues
- ✅ Stripe environment variables properly configured (VITE_STRIPE_PUBLIC_KEY for frontend, STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET for backend)
- ✅ Payment intents with server-side validation, replay protection via paymentIntentId tracking
- ✅ Fixed critical Chrome browser bug where text inputs became unresponsive after document processing
- ✅ Implemented isTypingTarget() guard functions in DocumentViewer and VirtualizedDocumentViewer components
- ✅ Prevented global text selection event listeners from interfering with input fields in Chrome
- ✅ Resolved post-processing input blocking while maintaining text selection functionality

**August 29, 2025**: 
- ✅ Completed dual-document functionality with auto-complete for short documents
- ✅ Implemented two-document podcast generation with consolidation workflow
- ✅ Fixed podcast download system with server-side file storage and proper download endpoints
- ✅ Replaced download button with clear user instructions: "Right-click audio player and select Save audio as..."
- ✅ Removed redundant "Combine" button from two-document interface (kept working "Synthesize" button)
- ✅ Enhanced all dual-document functions (Test Me, Podcast, Rewrite) with smart content detection
- ✅ Auto-complete detects short documents (≤1 chunk) and uses entire content automatically
- ✅ Maintained manual text selection capability for targeted analysis
- ✅ Streamlined UI with essential, working buttons only

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **UI**: Radix UI components with shadcn/ui design system, styled with Tailwind CSS.
- **State Management**: TanStack Query (React Query)
- **Math Rendering**: KaTeX integration for mathematical notation.
- **Document Viewing**: Uses iframe-based viewers for stable and flicker-free document rendering.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **File Processing**: Multer handles PDF, DOCX, and TXT uploads. Custom utilities and Mammoth.js are used for text extraction and preserving original HTML formatting from various document types.
- **AI Integration**: Primarily uses OpenAI GPT-4o for document analysis and chat, with support for DeepSeek, Anthropic, and Perplexity.
- **Audio Processing**: Generates SSML scripts for natural speech with different voices (e.g., "alloy" for HOST, "nova" for GUEST) for podcast generation.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM, utilizing Neon Database for serverless hosting.
- **Schema Management**: Drizzle Kit for migrations.

### Core Features & Design Patterns
- **Document Processing Pipeline**: Manages file uploads, text extraction, math notation formatting, and storage while preserving document structure.
- **Text Selection System**: Allows users to highlight text for targeted AI analysis with auto-complete functionality for short documents.
- **Contextual AI Chat**: AI interactions are focused on the selected text, rather than the entire document.
- **Content Generation**: Includes comprehensive podcast generation (single, dialogue, custom modes) and content rewriting with custom instructions.
- **Study Tools**: Features include Study Guide generation, Test Me (with customizable difficulty levels and varied question types), Cognitive Map generation (with Mermaid diagrams), Suggested Readings, and Thesis Deep-Dive for scholarly analysis.
- **Two-Document Comparison**: Supports side-by-side comparison with comprehensive dual-document functions including Test Me, Podcast generation (with two-step consolidation workflow), Rewrite, and mind map generation. All functions support auto-complete for short documents (single chunks) and manual text selection for larger documents.
- **Auto-Complete Intelligence**: Short documents (≤1000 words, single chunk) automatically use entire content when no manual selection is made, while preserving manual selection capability for targeted analysis.
- **User Experience**: Employs a clean, streamlined UI with a popup toolbar for text selection actions, toast notifications for feedback, and flexible input options (file uploads or direct text). Chat input and content generation buttons are persistently accessible.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm & drizzle-kit**: ORM and migration tools.
- **@tanstack/react-query**: Server state management.
- **multer**: File upload handling.
- **openai**: AI chat completions.
- **@radix-ui/***: UI component primitives.
- **tailwindcss**: CSS framework.
- **wouter**: React router.
- **KaTeX**: Math notation rendering.
- **html-react-parser**: HTML content rendering.
- **mammoth.js**: DOCX to HTML conversion.
- **mermaid.js**: Diagram generation.
- **docx**: DOCX file generation.
- **Microsoft Azure TTS**: Text-to-speech synthesis.
- **Vite**: Build tool.
- **DeepSeek, Anthropic, Perplexity**: Additional AI providers.