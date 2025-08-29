import { useState, useCallback, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, MessageSquare, Send, X, BookOpen, Download, Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DocumentViewerIframe from "@/components/DocumentViewerIframe";
import ComparisonChatInterface from "@/components/ComparisonChatInterface";
import TextSelectionPopup from "@/components/TextSelectionPopup";
import TextSelectionHandler from "@/components/TextSelectionHandler";
import KaTeXRenderer from "@/components/KaTeXRenderer";
import { downloadAIResponseAsWord } from "@/utils/wordGenerator";
import StudyGuideModal from "@/components/StudyGuideModal";
import TestMeModal from "@/components/TestMeModal";
import PodcastModal from "@/components/PodcastModal";
import RewriteModal from "@/components/RewriteModal";
import CognitiveMapModal from "@/components/CognitiveMapModal";
import SummaryThesisModal from "@/components/SummaryThesisModal";
import ThesisDeepDiveModal from "@/components/ThesisDeepDiveModal";
import SuggestedReadingsModal from "@/components/SuggestedReadingsModal";

// Using any type to match existing codebase pattern
type Document = any;

export default function ComparePage() {
  const [documentA, setDocumentA] = useState<Document | null>(null);
  const [documentB, setDocumentB] = useState<Document | null>(null);
  const [isUploadingA, setIsUploadingA] = useState(false);
  const [isUploadingB, setIsUploadingB] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("documents");
  const [dragActiveA, setDragActiveA] = useState(false);
  const [dragActiveB, setDragActiveB] = useState(false);
  // Text input mode removed - comparison page only supports file uploads
  
  // Document chunking states for large documents
  const [documentChunksA, setDocumentChunksA] = useState<any>(null);
  const [documentChunksB, setDocumentChunksB] = useState<any>(null);
  
  // Text Selection State
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionDocument, setSelectionDocument] = useState<string>("");
  
  // Modal States for Text Selection Features
  const [showStudyGuideModal, setShowStudyGuideModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showPodcastModal, setPodcastModal] = useState(false);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [showCognitiveMapModal, setShowCognitiveMapModal] = useState(false);
  const [showSummaryThesisModal, setShowSummaryThesisModal] = useState(false);
  const [showThesisDeepDiveModal, setShowThesisDeepDiveModal] = useState(false);
  const [showSuggestedReadingsModal, setShowSuggestedReadingsModal] = useState(false);
  
  // Chat state
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState("deepseek");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Document Column component - FILE UPLOAD ONLY
  const DocumentColumn = ({  
    title, 
    document: doc, 
    isUploading, 
    column,
    dragActive,
    onFileUpload,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onTextSelection
  }: { 
    title: string; 
    document: Document | null; 
    isUploading: boolean; 
    column: 'A' | 'B';
    dragActive: boolean;
    onFileUpload: (file: File, column: 'A' | 'B') => void;
    onDragEnter: (e: React.DragEvent, column: 'A' | 'B') => void;
    onDragLeave: (e: React.DragEvent, column: 'A' | 'B') => void;
    onDragOver: (e: React.DragEvent) => void;
    onTextSelection: (docTitle: string) => void;
  }) => {
    return (
    <div className="flex-1">
      <Card className="h-[1400px] flex flex-col overflow-hidden">
        <CardHeader className="py-0 px-2 h-8 min-h-0">
          <CardTitle className="flex items-center gap-1 text-xs">
            <FileText className="w-3 h-3" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden p-0" style={{ height: 'calc(100% - 32px)' }}>
          {!doc ? (
            <div className="flex-1 flex flex-col space-y-0" style={{ height: 'calc(100% - 0px)' }}>
              <div 
                className={`flex-1 flex items-center justify-center border-2 border-dashed rounded-lg mx-2 mb-2 cursor-pointer transition-colors ${
                  isUploading ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' :
                  dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 
                  'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onDragEnter={(e) => onDragEnter(e, column)}
                onDragLeave={(e) => onDragLeave(e, column)}
                onDragOver={onDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length > 0) {
                    onFileUpload(files[0], column);
                  }
                }}
                onClick={() => {
                  document.getElementById(`file-input-${column}`)?.click();
                }}
                style={{ minHeight: '1200px', height: 'calc(100% - 32px)' }}
              >
                <input
                  id={`file-input-${column}`}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onFileUpload(e.target.files[0], column);
                      e.target.value = ''; // Reset input
                    }
                  }}
                  className="hidden"
                />
                <div className="text-center">
                  {isUploading ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                        Uploading Document {column}...
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please wait while we process your file
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className={`w-12 h-12 mx-auto ${
                        dragActive ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        {dragActive ? `Drop Document ${column} here` : `Upload Document ${column}`}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {dragActive ? 'Release to upload' : 'Drop a file here or click to browse'}
                      </p>
                      {!dragActive && (
                        <>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Supports PDF, Word, and TXT files
                          </p>
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById(`file-input-${column}`)?.click();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 mt-3 touch-manipulation"
                          >
                            Select File
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-0">
              <div className="flex items-center justify-between mb-0 h-6">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate text-xs">{doc.title}</h3>
                </div>
                <div className="flex gap-2 ml-4">
                  <div className="relative">
                    <input
                      id={`replace-${column}`}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          onFileUpload(e.target.files[0], column);
                          e.target.value = ''; // Reset input
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => document.getElementById(`replace-${column}`)?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      {isUploading ? 'Uploading...' : 'Replace'}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (column === 'A') {
                        setDocumentA(null);
                      } else {
                        setDocumentB(null);
                      }
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded m-2 overflow-hidden">
                <DocumentViewerIframe 
                  content={doc.content}
                  onTextSelection={() => onTextSelection(doc.title)}
                />
              </div>
              
              {documentChunksA && column === 'A' && (
                <div className="mx-2 mb-2">
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                    Large document chunked: {documentChunksA.chunkCount} sections, {documentChunksA.totalWordCount} words
                  </p>
                </div>
              )}
              
              {documentChunksB && column === 'B' && (
                <div className="mx-2 mb-2">
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                    Large document chunked: {documentChunksB.chunkCount} sections, {documentChunksB.totalWordCount} words
                  </p>
                </div>
              )}
            </div>
          )}
          
          {showSelectionPopup && selectionDocument === title && (
            <TextSelectionHandler
              selectedText={selectedText}
              onStudyGuide={handleStudyGuide}
              onTestMe={handleTestMe}
              onPodcast={handlePodcast}
              onRewrite={handleRewrite}
              onCognitiveMap={handleCognitiveMap}
              onSummaryThesis={handleSummaryThesis}
              onThesisDeepDive={handleThesisDeepDive}
              onSuggestedReadings={handleSuggestedReadings}
              onClose={() => setShowSelectionPopup(false)}
            />
          )}
        </CardContent>
      </Card>
    </div>
    );
  };

  // Rest of the component implementation with handlers and return statement would go here
  // For now, return a simple placeholder to make the file compilable
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          Living Book Creator - Document Comparison
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 min-h-[900px] pb-32 overflow-visible">
          {/* Document A - Takes 2/6 */}
          <div className="lg:col-span-2">
            <DocumentColumn
              title="Document A"
              document={documentA}
              isUploading={isUploadingA}
              column="A"
              dragActive={dragActiveA}
              onFileUpload={() => {}}
              onDragEnter={() => {}}
              onDragLeave={() => {}}
              onDragOver={() => {}}
              onTextSelection={() => {}}
            />
          </div>
          
          {/* Document B - Takes 2/6 */}
          <div className="lg:col-span-2">
            <DocumentColumn
              title="Document B"
              document={documentB}
              isUploading={isUploadingB}
              column="B"
              dragActive={dragActiveB}
              onFileUpload={() => {}}
              onDragEnter={() => {}}
              onDragLeave={() => {}}
              onDragOver={() => {}}
              onTextSelection={() => {}}
            />
          </div>
          
          {/* Chat Column - Takes 2/6 */}
          <div className="lg:col-span-2">
            <Card className="h-[1400px] flex flex-col">
              <CardHeader className="py-0 px-2 h-8 min-h-0">
                <CardTitle className="text-xs">AI Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-2">
                <p className="text-sm text-gray-500">Chat interface will be implemented here.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder handler functions
const handleStudyGuide = () => {};
const handleTestMe = () => {};
const handlePodcast = () => {};
const handleRewrite = () => {};
const handleCognitiveMap = () => {};
const handleSummaryThesis = () => {};
const handleThesisDeepDive = () => {};
const handleSuggestedReadings = () => {};