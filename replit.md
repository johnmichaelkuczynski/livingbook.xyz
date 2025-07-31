# DocMath AI - Document Processing & AI Chat

## Overview

DocMath AI is a full-stack web application for uploading and interacting with documents via an AI-powered chat interface. It specializes in processing mathematical content with proper notation rendering, catering to educational and academic use cases. The project aims to provide comprehensive tools for document analysis, content generation, and structured information extraction, enhancing accessibility and readability of complex texts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **UI**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS custom properties
- **State Management**: TanStack Query (React Query)
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **File Processing**: Multer for PDF, DOCX, TXT uploads
- **AI Integration**: OpenAI GPT-4o for document analysis and chat
- **Document Processing**: Custom utilities for text extraction and math notation processing, preserving original HTML formatting from various document types (e.g., Mammoth.js for DOCX)

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM (using Neon Database serverless provider)
- **Schema Management**: Drizzle Kit for migrations
- **Development**: In-memory storage option

### Core Features & Design Patterns
- **Document Processing Pipeline**: Handles file upload, text extraction, math notation formatting, and storage. Includes robust HTML preservation to maintain document structure and styling.
- **AI Chat System**: Manages chat sessions, message threading, context-aware responses, and math-focused prompting.
- **Content Analysis Tools**:
    - **Summary+Thesis**: Extracts concise thesis statements and structured summaries.
    - **Cognitive Map**: Generates visual concept maps using Mermaid.js from text, with dual visual/text hierarchy views.
    - **Thesis Deep-Dive**: Provides detailed scholarly analysis, extracting core theses, original wording, modern applications, and cross-comparison analysis.
    - **Suggested Readings**: Generates academic bibliographies based on text themes.
- **Content Generation**: Includes text rewriting and podcast generation using Azure TTS with in-app playback.
- **Dual Document Comparison**: Allows side-by-side comparison of two documents with AI analysis.
- **Output & Download**: Supports PDF (with KaTeX rendering), DOCX (genuine .docx files), and TXT downloads for all AI responses and processed content.
- **Modals**: Analysis modals are draggable and resizable with position persistence.
- **Input Flexibility**: Supports both file uploads and direct text input.
- **Scalability**: Designed with automatic content truncation and chunking for large documents to manage API token limits.
- **User Experience**: Focus on clean, readable AI responses, fixed input box positioning, and mobile compatibility.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm & drizzle-kit**: ORM and migration tools
- **@tanstack/react-query**: Server state management
- **multer**: File upload handling
- **openai**: AI chat completions
- **@radix-ui/***: UI component primitives
- **tailwindcss**: CSS framework
- **wouter**: React router
- **KaTeX**: Math notation rendering
- **html-react-parser**: HTML content rendering
- **mammoth.js**: DOCX to HTML conversion
- **mermaid.js**: Diagram generation
- **docx**: DOCX file generation
- **Microsoft Azure TTS**: Text-to-speech synthesis
- **Vite**: Build tool
- **DeepSeek, Anthropic, Perplexity**: Additional AI providers for chat functionality.