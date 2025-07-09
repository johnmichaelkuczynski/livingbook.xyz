/**
 * Text Segmentation Service
 * Identifies logical joints in text for mind map generation
 */

export interface TextSegment {
  id: string;
  content: string;
  type: 'chapter' | 'section' | 'paragraph' | 'thematic_break' | 'speaker_change';
  startPosition: number;
  endPosition: number;
  title?: string;
  summary?: string;
}

export interface SegmentationResult {
  segments: TextSegment[];
  totalSegments: number;
  segmentationMethod: string;
}

/**
 * Identify chapter breaks and major sections
 */
function identifyChapterBreaks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  
  // Patterns for chapter breaks
  const chapterPatterns = [
    /^Chapter\s+\d+/gmi,
    /^Part\s+\d+/gmi,
    /^Section\s+\d+/gmi,
    /^\d+\.\s+[A-Z]/gm,
    /^[A-Z][A-Z\s]{10,}/gm // All caps headings
  ];
  
  let lastPosition = 0;
  let segmentId = 1;
  
  for (const pattern of chapterPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    
    for (const match of matches) {
      if (match.index && match.index > lastPosition) {
        // Create segment from last position to this match
        if (lastPosition > 0) {
          segments.push({
            id: `chapter_${segmentId}`,
            content: text.substring(lastPosition, match.index).trim(),
            type: 'chapter',
            startPosition: lastPosition,
            endPosition: match.index,
            title: extractTitle(text.substring(lastPosition, Math.min(lastPosition + 100, match.index)))
          });
          segmentId++;
        }
        lastPosition = match.index;
      }
    }
  }
  
  // Add final segment
  if (lastPosition < text.length) {
    segments.push({
      id: `chapter_${segmentId}`,
      content: text.substring(lastPosition).trim(),
      type: 'chapter',
      startPosition: lastPosition,
      endPosition: text.length,
      title: extractTitle(text.substring(lastPosition, Math.min(lastPosition + 100, text.length)))
    });
  }
  
  return segments;
}

/**
 * Identify thematic transitions within text
 */
function identifyThematicBreaks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  
  // Split by strong thematic indicators
  const thematicMarkers = [
    /However,/gi,
    /Nevertheless,/gi,
    /On the other hand,/gi,
    /In contrast,/gi,
    /Furthermore,/gi,
    /Moreover,/gi,
    /Therefore,/gi,
    /Thus,/gi,
    /Consequently,/gi,
    /\n\n\s*\*\s*\*\s*\*\s*\n/g, // Three asterisks
    /\n\n---+\n/g // Horizontal rules
  ];
  
  const paragraphs = text.split(/\n\s*\n/);
  let currentSegment = '';
  let startPosition = 0;
  let segmentId = 1;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const hasThematicBreak = thematicMarkers.some(marker => 
      marker.test(paragraph.substring(0, 50))
    );
    
    if (hasThematicBreak && currentSegment.length > 500) {
      // End current segment
      segments.push({
        id: `theme_${segmentId}`,
        content: currentSegment.trim(),
        type: 'thematic_break',
        startPosition: startPosition,
        endPosition: startPosition + currentSegment.length,
        title: extractTitle(currentSegment.substring(0, 100))
      });
      
      segmentId++;
      startPosition += currentSegment.length;
      currentSegment = paragraph;
    } else {
      currentSegment += (currentSegment ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add final segment
  if (currentSegment.trim()) {
    segments.push({
      id: `theme_${segmentId}`,
      content: currentSegment.trim(),
      type: 'thematic_break',
      startPosition: startPosition,
      endPosition: startPosition + currentSegment.length,
      title: extractTitle(currentSegment.substring(0, 100))
    });
  }
  
  return segments;
}

/**
 * Identify speaker changes in dialogues
 */
function identifySpeakerChanges(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  
  // Patterns for dialogue markers
  const dialoguePatterns = [
    /^"[^"]+"/gm, // Quoted speech
    /^[A-Z][a-z]+:\s/gm, // Speaker: format
    /said\s+[A-Z][a-z]+/gm, // "said Someone"
    /replied\s+[A-Z][a-z]+/gm // "replied Someone"
  ];
  
  let segments_found = false;
  
  for (const pattern of dialoguePatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 2) { // Only if we find multiple dialogue instances
      segments_found = true;
      break;
    }
  }
  
  if (!segments_found) {
    return [];
  }
  
  // Split by dialogue patterns
  const lines = text.split('\n');
  let currentSegment = '';
  let startPosition = 0;
  let segmentId = 1;
  
  for (const line of lines) {
    const hasDialogue = dialoguePatterns.some(pattern => pattern.test(line));
    
    if (hasDialogue && currentSegment.length > 200) {
      segments.push({
        id: `speaker_${segmentId}`,
        content: currentSegment.trim(),
        type: 'speaker_change',
        startPosition: startPosition,
        endPosition: startPosition + currentSegment.length,
        title: extractTitle(currentSegment.substring(0, 50))
      });
      
      segmentId++;
      startPosition += currentSegment.length;
      currentSegment = line;
    } else {
      currentSegment += (currentSegment ? '\n' : '') + line;
    }
  }
  
  // Add final segment
  if (currentSegment.trim()) {
    segments.push({
      id: `speaker_${segmentId}`,
      content: currentSegment.trim(),
      type: 'speaker_change',
      startPosition: startPosition,
      endPosition: startPosition + currentSegment.length,
      title: extractTitle(currentSegment.substring(0, 50))
    });
  }
  
  return segments;
}

/**
 * Extract title from text segment
 */
function extractTitle(text: string): string {
  // Remove newlines and extra spaces
  const cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Try to find a sentence that could serve as a title
  const sentences = cleaned.split(/[.!?]/);
  const firstSentence = sentences[0]?.trim();
  
  if (firstSentence && firstSentence.length > 10 && firstSentence.length < 80) {
    return firstSentence;
  }
  
  // Fallback: use first 50 characters
  return cleaned.substring(0, 50) + (cleaned.length > 50 ? '...' : '');
}

/**
 * Main segmentation function
 */
export function segmentText(text: string, method: 'auto' | 'chapter' | 'thematic' | 'dialogue' = 'auto'): SegmentationResult {
  let segments: TextSegment[] = [];
  let segmentationMethod = method;
  
  if (method === 'auto') {
    // Try different segmentation methods and pick the best one
    const chapterSegments = identifyChapterBreaks(text);
    const thematicSegments = identifyThematicBreaks(text);
    const speakerSegments = identifySpeakerChanges(text);
    
    // Choose the method that produces the most reasonable number of segments
    if (chapterSegments.length >= 2 && chapterSegments.length <= 20) {
      segments = chapterSegments;
      segmentationMethod = 'chapter';
    } else if (thematicSegments.length >= 3 && thematicSegments.length <= 15) {
      segments = thematicSegments;
      segmentationMethod = 'thematic';
    } else if (speakerSegments.length >= 2 && speakerSegments.length <= 25) {
      segments = speakerSegments;
      segmentationMethod = 'dialogue';
    } else {
      // Fallback: split by paragraphs in chunks
      segments = createParagraphSegments(text);
      segmentationMethod = 'paragraph';
    }
  } else {
    switch (method) {
      case 'chapter':
        segments = identifyChapterBreaks(text);
        break;
      case 'thematic':
        segments = identifyThematicBreaks(text);
        break;
      case 'dialogue':
        segments = identifySpeakerChanges(text);
        break;
    }
  }
  
  // If no segments found, create paragraph-based segments
  if (segments.length === 0) {
    segments = createParagraphSegments(text);
    segmentationMethod = 'paragraph';
  }
  
  return {
    segments,
    totalSegments: segments.length,
    segmentationMethod
  };
}

/**
 * Fallback: create segments based on paragraphs
 */
function createParagraphSegments(text: string): TextSegment[] {
  const paragraphs = text.split(/\n\s*\n/);
  const segments: TextSegment[] = [];
  let currentPosition = 0;
  let segmentId = 1;
  
  // Group paragraphs into reasonable segments (3-5 paragraphs each)
  for (let i = 0; i < paragraphs.length; i += 4) {
    const segmentParagraphs = paragraphs.slice(i, i + 4);
    const segmentContent = segmentParagraphs.join('\n\n');
    
    segments.push({
      id: `para_${segmentId}`,
      content: segmentContent,
      type: 'paragraph',
      startPosition: currentPosition,
      endPosition: currentPosition + segmentContent.length,
      title: extractTitle(segmentContent)
    });
    
    currentPosition += segmentContent.length;
    segmentId++;
  }
  
  return segments;
}

/**
 * Combine segments based on user selection
 */
export function mergeSegments(segments: TextSegment[], segmentIds: string[]): TextSegment {
  const selectedSegments = segments.filter(seg => segmentIds.includes(seg.id));
  
  if (selectedSegments.length === 0) {
    throw new Error('No segments selected for merging');
  }
  
  // Sort by position
  selectedSegments.sort((a, b) => a.startPosition - b.startPosition);
  
  const mergedContent = selectedSegments.map(seg => seg.content).join('\n\n---\n\n');
  const firstSegment = selectedSegments[0];
  const lastSegment = selectedSegments[selectedSegments.length - 1];
  
  return {
    id: `merged_${segmentIds.join('_')}`,
    content: mergedContent,
    type: 'chapter', // Merged segments are treated as chapters
    startPosition: firstSegment.startPosition,
    endPosition: lastSegment.endPosition,
    title: `Merged: ${firstSegment.title}`,
    summary: `Combined ${selectedSegments.length} segments`
  };
}