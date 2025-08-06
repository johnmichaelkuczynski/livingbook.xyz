# DocMath AI - Document Processing & AI Chat

## Overview

DocMath AI is a streamlined document processing web application focused on text selection and AI-powered contextual analysis. The application now prioritizes core functionality: users can upload documents, select specific text passages, and ask AI questions about their selections. All complex modal features have been removed to focus on the essential text selection workflow.

## Recent Changes (January 2025)

- **Text Selection Context Fixed**: Resolved critical issue where AI was analyzing entire documents instead of selected passages
- **Podcast Generation Added**: Implemented comprehensive podcast system with three modes (single person, two person dialogue, custom instructions)
- **OpenAI Dual-Voice Integration**: Enhanced podcast system with dual voices - HOST uses "alloy" voice, GUEST uses "nova" voice for natural conversations
- **Popup Toolbar System**: Redesigned UI from permanent buttons to clean popup toolbar that appears on text selection, accommodating 10+ action buttons
- **Voice Quality Fixed**: Eliminated identical voices and removed awkward "HOST:"/"GUEST:" prefixes from spoken audio for professional podcast quality
- **UI Button Visibility Fixed**: Resolved critical issue where podcast/rewrite buttons were hidden by notifications - made buttons prominent and always visible
- **Rewrite Text Readability**: Fixed light gray text issue - now uses dark, readable text with proper contrast
- **Rewrite Function Added**: Created comprehensive rewrite system that works with selected text or document sections specified in instructions
- **Visual Feedback**: Added toast notifications and input styling to indicate when text is selected with colored buttons
- **Data Flow**: Fixed client-to-server communication to properly pass selected text context
- **Smart Content Selection**: Both podcast and rewrite functions work with either selected text passages or full documents/specified sections
- **Error Handling**: Fixed critical runtime errors in popup toolbar system and streamlined code architecture
- **Download Functionality Fixed**: Implemented robust podcast download system with dedicated endpoint and fallback mechanisms
- **Study Guide Function Working**: Fixed missing modal rendering - study guide generation now fully functional with proper UI display
- **Cognitive Map Function Working**: Fixed critical connection bug - cognitive map now generates both logical structure analysis and interactive Mermaid diagrams
- **Suggested Readings Function Working**: Connected function to toolbar and modal rendering - generates curated academic reading lists with authors and relevance explanations

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
- **Content Rewriting**: Advanced rewrite function that allows custom instructions for selected text or document sections (e.g., "Chapter 2").
- **Smart Content Selection**: Both podcast and rewrite functions work with either selected text passages or full documents/specified sections.
- **Visual Feedback**: Toast notifications and input styling provide clear indication when text is selected.
- **Multi-Provider AI**: Supports DeepSeek, OpenAI, Anthropic, and Perplexity for chat responses.
- **Math Rendering**: KaTeX integration for proper mathematical notation display.
- **Input Flexibility**: Supports both file uploads (PDF, DOCX, TXT) and direct text input.
- **Clean Interface**: Streamlined UI with essential podcast functionality integrated.
- **Fixed Input**: Bottom-positioned chat input with podcast and rewrite buttons that stay accessible while browsing documents.

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