# Living Book Creator

## Overview

Living Book Creator is a web application designed for streamlined document processing and AI-powered contextual analysis. Its core purpose is to enable users to upload documents, select specific text passages, and interact with an AI to ask questions and perform various operations on their selections. The application focuses on essential text selection workflows, providing tools for study, content generation (like podcasts and rewrites), and advanced analytical features.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Text Selection System**: Allows users to highlight text for targeted AI analysis.
- **Contextual AI Chat**: AI interactions are focused on the selected text, rather than the entire document.
- **Content Generation**: Includes comprehensive podcast generation (single, dialogue, custom modes) and content rewriting with custom instructions.
- **Study Tools**: Features include Study Guide generation, Test Me (with customizable difficulty levels and varied question types), Cognitive Map generation (with Mermaid diagrams), Suggested Readings, and Thesis Deep-Dive for scholarly analysis.
- **Two-Document Comparison**: Supports side-by-side comparison with features like a three-stage mind map protocol that generates individual mind maps for each document and a meta-map identifying analogies and similarities.
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