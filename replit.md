# DocMath AI - Document Processing & AI Chat

## Overview

DocMath AI is a full-stack web application that allows users to upload documents (PDF, Word, TXT) and interact with their content through an AI-powered chat interface. The application specializes in processing mathematical content with proper notation rendering, making it ideal for educational and academic use cases.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **File Processing**: Multer for file uploads with support for PDF, DOCX, and TXT files
- **AI Integration**: OpenAI GPT-4o for document analysis and chat responses
- **Development**: Hot module replacement via Vite integration

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Development Storage**: In-memory storage implementation for development/testing

### Authentication and Authorization
- Currently using a simplified storage interface without authentication
- Prepared for user management with user schema defined
- Session management ready for implementation

## Key Components

### Document Processing Pipeline
1. **File Upload**: Multer handles file validation and temporary storage
2. **Text Extraction**: Service layer processes different file types
3. **Math Notation Processing**: Custom utilities identify and format mathematical expressions
4. **Storage**: Documents stored in PostgreSQL with metadata

### AI Chat System
1. **Chat Sessions**: Each document gets its own chat session
2. **Message Threading**: Complete conversation history maintained
3. **Context-Aware Responses**: AI has access to full document content
4. **Math-Focused Prompting**: System prompts optimized for mathematical content explanation

### UI Components
- **FileUpload**: Drag-and-drop interface with file validation
- **DocumentViewer**: Scrollable text display with math notation rendering
- **ChatInterface**: Real-time chat with typing indicators and message history
- **Responsive Design**: Mobile-first approach with grid layouts

## Data Flow

### Document Upload Flow
1. User selects/drops file → FileUpload component
2. File validated against allowed types (PDF, DOCX, TXT)
3. Multer processes upload → temporary file storage
4. Document service extracts text content
5. Math notation processor enhances formatting
6. Document stored in database with metadata
7. UI updates with processed document

### Chat Interaction Flow
1. User sends message → ChatInterface component
2. Message stored in database with session context
3. OpenAI service receives message + document content + conversation history
4. AI generates contextual response focused on document content
5. Response stored and displayed in real-time
6. Query client invalidates cache for fresh data

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm & drizzle-kit**: Type-safe database operations and migrations
- **@tanstack/react-query**: Server state management and caching
- **multer**: File upload handling
- **openai**: AI chat completions

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **wouter**: Lightweight React router

### Development Dependencies
- **vite**: Build tool and development server
- **@replit/vite-plugin-***: Replit-specific development enhancements
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Requirements
- **DATABASE_URL**: PostgreSQL connection string (required)
- **OPENAI_API_KEY**: OpenAI API access (required for chat functionality)
- **NODE_ENV**: Environment setting (development/production)

### Production Deployment
- **Start Command**: `npm start` runs compiled server
- **Static Files**: Express serves built frontend from `dist/public`
- **Database**: Requires PostgreSQL database provisioning
- **File Storage**: Local filesystem for uploaded files (temporary)

## Changelog
- July 06, 2025: MATH RENDERING & PERFORMANCE OPTIMIZATIONS - FULLY FUNCTIONAL
  - **FIXED**: Math rendering completely resolved with new KaTeXRenderer component supporting all LaTeX/KaTeX symbols (Σ, π, ∫, etc.)
  - **ADDED**: Automatic document chunking for large documents (1000+ words) with efficient chunked display
  - **ENHANCED**: Document replacement functionality in comparison mode - both Document A and B can be swapped mid-conversation
  - **IMPROVED**: Upload system handles full documents without truncation while maintaining performance through chunking
  - **VERIFIED**: User confirmed "MUCH BETTER" - all critical issues resolved and system fully operational
  - All components now use improved KaTeXRenderer instead of broken SimpleMathRenderer
- July 05, 2025: DOCUMENT REPLACEMENT & FRESH START FEATURES - DEPLOYMENT READY
  - **FIXED**: Document replacement functionality now works properly with correct file input handling
  - **ADDED**: "Start Fresh" button to clear all documents and conversation history
  - **IMPROVED**: Enhanced error handling and logging for deployment debugging
  - **ADDED**: Session ID display and visual indicators for better user feedback
  - Users can now replace documents mid-conversation or start completely fresh
- July 05, 2025: COMPARISON CHAT FOLLOW-UP FIXES - SESSION MANAGEMENT PERFECTED
  - **FIXED**: Follow-up questions in comparison mode no longer stall
  - **IMPLEMENTED**: Proper session tracking to maintain conversation context
  - **VERIFIED**: User confirmed "MUCH BETTER" - comparison chat fully functional for multiple questions
  - Backend now reuses existing sessions instead of creating new ones per message
  - All conversation history properly maintained between follow-up questions
- July 05, 2025: CRITICAL UX FIXES - PERFECT USER EXPERIENCE ACHIEVED
  - **FIXED**: Removed all markdown formatting (**, ##, etc.) from AI responses for clean, readable text
  - **FIXED**: Input box positioning - now fixed at bottom of screen (always accessible)
  - **VERIFIED**: User confirmed "MUCH MUCH MUCH BETTER" - critical usability issues resolved
  - Input remains accessible even with very long documents
  - Professional, clean AI responses without distracting markup symbols
- July 05, 2025: DUAL DOCUMENT COMPARISON FEATURE - FULLY OPERATIONAL
  - Built complete dual-document comparison system with three-column layout
  - Side-by-side document upload (Document A & Document B) with AI chat column
  - Enhanced drag-and-drop functionality with visual feedback for all upload areas
  - AI successfully analyzing and comparing both documents simultaneously
  - Real-time comparison chat working with all four providers (DeepSeek, OpenAI, Anthropic, Perplexity)
  - Extended backend with comparison sessions, messages, and proper API endpoints
  - **VERIFIED WORKING**: AI providing detailed document comparisons and analysis
- July 05, 2025: FULL REACTIVATION - All AI services operational
  - All four AI provider API keys configured and active (OpenAI, DeepSeek, Anthropic, Perplexity)
  - Application successfully responding to chat requests with 30+ second processing times
  - MathJax rendering working properly for mathematical notation
  - Document upload and processing pipeline fully functional
  - Real-time chat interface with conversation history working
- July 03, 2025: MAJOR FIXES - Resolved AI chat functionality and "Convert to Document" feature
  - Fixed broken AI chat session management and message retrieval
  - Updated all AI providers to work without requiring document uploads
  - Implemented complete document conversion from AI responses with clean formatting
  - Fixed API response parsing and database schema validation issues
  - AI now handles general requests (essays, creative writing, etc.) without restrictions
- July 02, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.