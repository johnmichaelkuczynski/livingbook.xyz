# DocMath AI - Document Processing & AI Chat

## Overview

DocMath AI is a streamlined document processing web application focused on text selection and AI-powered contextual analysis. The application now prioritizes core functionality: users can upload documents, select specific text passages, and ask AI questions about their selections. All complex modal features have been removed to focus on the essential text selection workflow.

## Recent Changes (January 2025)

- **Text Selection Context Fixed**: Resolved critical issue where AI was analyzing entire documents instead of selected passages
- **Podcast Generation Added**: Implemented comprehensive podcast system with three modes (single person, two person dialogue, custom instructions)
- **Azure Speech Integration**: Added full Azure Speech API integration for audio generation with different voices for dialogue mode
- **Visual Feedback**: Added toast notifications and input styling to indicate when text is selected
- **Data Flow**: Fixed client-to-server communication to properly pass selected text context
- **Smart Content Selection**: Podcast generation works with either selected text passages or full documents

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
- **Document Processing Pipeline**: Handles file upload, text extraction, math notation formatting, and storage with HTML preservation for document structure.
- **Text Selection System**: Users can highlight specific passages in documents for targeted AI analysis.
- **Contextual AI Chat**: AI analyzes only the selected text passage instead of the entire document when text is highlighted.
- **Podcast Generation**: Three-mode system (single person, two person dialogue, custom instructions) with Azure Speech API integration.
- **Audio Processing**: Generates SSML scripts for natural speech with different voices for dialogue participants.
- **Smart Content Selection**: Works with both selected text passages and full documents for podcast generation.
- **Visual Feedback**: Toast notifications and input styling provide clear indication when text is selected.
- **Multi-Provider AI**: Supports DeepSeek, OpenAI, Anthropic, and Perplexity for chat responses.
- **Math Rendering**: KaTeX integration for proper mathematical notation display.
- **Input Flexibility**: Supports both file uploads (PDF, DOCX, TXT) and direct text input.
- **Clean Interface**: Streamlined UI with essential podcast functionality integrated.
- **Fixed Input**: Bottom-positioned chat input with podcast button that stays accessible while browsing documents.

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