export interface DocumentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  startPosition: number;
  endPosition: number;
}

export interface ChunkedDocument {
  originalContent: string;
  chunks: DocumentChunk[];
  totalWordCount: number;
  chunkCount: number;
}

/**
 * Split document content into chunks of approximately maxWords
 */
export function chunkDocument(content: string, maxWords: number = 1000): ChunkedDocument {
  // Split content into paragraphs, preserving structure
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const totalWords = content.split(/\s+/).filter(word => word.length > 0);
  const totalWordCount = totalWords.length;
  
  if (totalWordCount <= maxWords) {
    return {
      originalContent: content,
      chunks: [{
        id: generateChunkId(0, 'full'),
        chunkIndex: 0,
        content: content.trim(),
        wordCount: totalWordCount,
        startPosition: 0,
        endPosition: content.length
      }],
      totalWordCount,
      chunkCount: 1
    };
  }
  
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;
  let currentChunk: string[] = [];
  let currentWordCount = 0;
  let startPosition = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    const paragraphWords = paragraph.split(/\s+/).filter(word => word.length > 0);
    const paragraphWordCount = paragraphWords.length;
    
    // If adding this paragraph would exceed maxWords, finalize current chunk
    if (currentWordCount + paragraphWordCount > maxWords && currentChunk.length > 0) {
      const chunkContent = currentChunk.join('\n\n');
      const endPosition = startPosition + chunkContent.length;
      
      chunks.push({
        id: generateChunkId(chunkIndex, 'para'),
        chunkIndex,
        content: chunkContent,
        wordCount: currentWordCount,
        startPosition,
        endPosition
      });
      
      chunkIndex++;
      startPosition = endPosition + 2; // +2 for paragraph break
      currentChunk = [];
      currentWordCount = 0;
    }
    
    // Add current paragraph to chunk
    currentChunk.push(paragraph);
    currentWordCount += paragraphWordCount;
  }
  
  // Add remaining content as final chunk
  if (currentChunk.length > 0) {
    const chunkContent = currentChunk.join('\n\n');
    const endPosition = startPosition + chunkContent.length;
    
    chunks.push({
      id: generateChunkId(chunkIndex, 'para'),
      chunkIndex,
      content: chunkContent,
      wordCount: currentWordCount,
      startPosition,
      endPosition
    });
  }
  
  return {
    originalContent: content,
    chunks,
    totalWordCount,
    chunkCount: chunks.length
  };
}

/**
 * Reconstruct document from chunks with potential modifications
 */
export function reconstructDocument(chunkedDoc: ChunkedDocument, modifiedChunks?: Map<number, string>): string {
  if (!modifiedChunks || modifiedChunks.size === 0) {
    return chunkedDoc.originalContent;
  }
  
  let reconstructed = '';
  let lastPosition = 0;
  
  for (const chunk of chunkedDoc.chunks) {
    // Add any content between last chunk and current chunk
    if (chunk.startPosition > lastPosition) {
      reconstructed += chunkedDoc.originalContent.slice(lastPosition, chunk.startPosition);
    }
    
    // Add either modified or original chunk content
    const modifiedContent = modifiedChunks.get(chunk.chunkIndex);
    reconstructed += modifiedContent || chunk.content;
    
    lastPosition = chunk.endPosition;
  }
  
  // Add any remaining content
  if (lastPosition < chunkedDoc.originalContent.length) {
    reconstructed += chunkedDoc.originalContent.slice(lastPosition);
  }
  
  return reconstructed;
}

/**
 * Get chunk by index
 */
export function getChunkByIndex(chunkedDoc: ChunkedDocument, index: number): DocumentChunk | null {
  return chunkedDoc.chunks.find(chunk => chunk.chunkIndex === index) || null;
}

/**
 * Find which chunk contains a specific word position
 */
export function findChunkByPosition(chunkedDoc: ChunkedDocument, position: number): DocumentChunk | null {
  return chunkedDoc.chunks.find(chunk => 
    position >= chunk.startPosition && position <= chunk.endPosition
  ) || null;
}

// Helper functions
function generateChunkId(index: number, type: string = 'chunk'): string {
  return `${type}_${index}_${Date.now()}`;
}

function findWordPosition(text: string, word: string, startFrom: number = 0): number {
  const index = text.indexOf(word, startFrom);
  return index >= 0 ? index : startFrom;
}

/**
 * Get chunk statistics for UI display
 */
export function getChunkStats(chunkedDoc: ChunkedDocument) {
  return {
    totalChunks: chunkedDoc.chunkCount,
    totalWords: chunkedDoc.totalWordCount,
    avgWordsPerChunk: Math.round(chunkedDoc.totalWordCount / chunkedDoc.chunkCount),
    chunks: chunkedDoc.chunks.map(chunk => ({
      index: chunk.chunkIndex,
      words: chunk.wordCount,
      preview: chunk.content.slice(0, 100) + (chunk.content.length > 100 ? '...' : '')
    }))
  };
}