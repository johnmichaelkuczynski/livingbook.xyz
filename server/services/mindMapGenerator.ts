/**
 * Mind Map Generator Service
 * Creates local and meta mind maps from text segments
 */

import * as openaiService from './openai';
import * as anthropicService from './anthropic';
import * as deepseekService from './deepseek';
import * as perplexityService from './perplexity';

export interface MindMapNode {
  id: string;
  label: string;
  type: 'central_claim' | 'supporting_argument' | 'objection' | 'example' | 'concept' | 'connection';
  content: string;
  level: number;
  parentId?: string;
  originalText?: string;
  position?: { x: number; y: number };
  color?: string;
  size?: number;
}

export interface MindMapEdge {
  id: string;
  from: string;
  to: string;
  type: 'supports' | 'opposes' | 'explains' | 'leads_to' | 'depends_on' | 'clusters_with';
  label?: string;
  strength?: number; // 0-1, how strong the connection is
}

export interface LocalMindMap {
  id: string;
  segmentId: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  centralClaim: string;
  summary: string;
  generatedAt: string;
}

export interface MetaMindMap {
  id: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  localMaps: string[]; // IDs of local maps included
  globalThemes: string[];
  conceptualClusters: { [key: string]: string[] };
  generatedAt: string;
}

/**
 * Generate a local mind map for a text segment
 */
export async function generateLocalMindMap(
  segmentId: string,
  content: string,
  title: string,
  provider: 'openai' | 'anthropic' | 'deepseek' | 'perplexity' = 'deepseek'
): Promise<LocalMindMap> {
  
  const prompt = `You are an expert at philosophical analysis and mind mapping. Analyze the following text segment and extract its logical structure in JSON format.

Text to analyze:
"""
${content}
"""

Extract and return a JSON object with this exact structure:
{
  "centralClaim": "The main thesis or central claim of this text",
  "supportingArguments": [
    {
      "id": "arg1",
      "content": "First supporting argument",
      "strength": 0.8
    }
  ],
  "objections": [
    {
      "id": "obj1", 
      "content": "Counter-argument or objection",
      "strength": 0.6
    }
  ],
  "examples": [
    {
      "id": "ex1",
      "content": "Concrete example or illustration",
      "relevance": 0.9
    }
  ],
  "keyConcepts": [
    {
      "id": "concept1",
      "term": "Important concept or term",
      "definition": "Brief definition or explanation"
    }
  ],
  "connections": [
    {
      "from": "arg1",
      "to": "central",
      "type": "supports",
      "strength": 0.8
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no other text or explanation.`;

  let aiResponse;
  switch (provider) {
    case 'openai':
      aiResponse = await openaiService.generateChatResponse(prompt, "", []);
      break;
    case 'anthropic':
      aiResponse = await anthropicService.generateChatResponse(prompt, "", []);
      break;
    case 'perplexity':
      aiResponse = await perplexityService.generateChatResponse(prompt, "", []);
      break;
    case 'deepseek':
    default:
      aiResponse = await deepseekService.generateChatResponse(prompt, "", []);
      break;
  }

  if (aiResponse.error) {
    throw new Error(`Failed to generate mind map: ${aiResponse.error}`);
  }

  try {
    // Clean the response to get just the JSON
    let jsonContent = aiResponse.message.trim();
    
    // Remove any markdown code blocks
    jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find JSON object boundaries
    const startIndex = jsonContent.indexOf('{');
    const lastIndex = jsonContent.lastIndexOf('}');
    
    if (startIndex !== -1 && lastIndex !== -1) {
      jsonContent = jsonContent.substring(startIndex, lastIndex + 1);
    }
    
    const analysis = JSON.parse(jsonContent);
    
    // Convert analysis to mind map format
    const mindMap = convertAnalysisToMindMap(segmentId, title, analysis);
    
    return mindMap;
    
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    console.error('Raw response:', aiResponse.message);
    
    // Fallback: create a basic mind map
    return createFallbackMindMap(segmentId, content, title);
  }
}

/**
 * Convert AI analysis to mind map format
 */
function convertAnalysisToMindMap(segmentId: string, title: string, analysis: any): LocalMindMap {
  const nodes: MindMapNode[] = [];
  const edges: MindMapEdge[] = [];
  
  // Central claim node
  nodes.push({
    id: 'central',
    label: 'Central Claim',
    type: 'central_claim',
    content: analysis.centralClaim || 'Main claim',
    level: 0,
    color: '#e74c3c',
    size: 30
  });
  
  // Supporting arguments
  if (analysis.supportingArguments) {
    analysis.supportingArguments.forEach((arg: any, index: number) => {
      const nodeId = arg.id || `arg_${index}`;
      nodes.push({
        id: nodeId,
        label: `Argument ${index + 1}`,
        type: 'supporting_argument',
        content: arg.content,
        level: 1,
        parentId: 'central',
        color: '#27ae60',
        size: 20
      });
      
      edges.push({
        id: `edge_${nodeId}_central`,
        from: nodeId,
        to: 'central',
        type: 'supports',
        strength: arg.strength || 0.7
      });
    });
  }
  
  // Objections
  if (analysis.objections) {
    analysis.objections.forEach((obj: any, index: number) => {
      const nodeId = obj.id || `obj_${index}`;
      nodes.push({
        id: nodeId,
        label: `Objection ${index + 1}`,
        type: 'objection',
        content: obj.content,
        level: 1,
        parentId: 'central',
        color: '#f39c12',
        size: 20
      });
      
      edges.push({
        id: `edge_${nodeId}_central`,
        from: nodeId,
        to: 'central',
        type: 'opposes',
        strength: obj.strength || 0.6
      });
    });
  }
  
  // Examples
  if (analysis.examples) {
    analysis.examples.forEach((ex: any, index: number) => {
      const nodeId = ex.id || `ex_${index}`;
      nodes.push({
        id: nodeId,
        label: `Example ${index + 1}`,
        type: 'example',
        content: ex.content,
        level: 2,
        color: '#3498db',
        size: 15
      });
      
      edges.push({
        id: `edge_${nodeId}_central`,
        from: nodeId,
        to: 'central',
        type: 'explains',
        strength: ex.relevance || 0.5
      });
    });
  }
  
  // Key concepts
  if (analysis.keyConcepts) {
    analysis.keyConcepts.forEach((concept: any, index: number) => {
      const nodeId = concept.id || `concept_${index}`;
      nodes.push({
        id: nodeId,
        label: concept.term,
        type: 'concept',
        content: concept.definition,
        level: 1,
        color: '#9b59b6',
        size: 18
      });
    });
  }
  
  // Additional connections from analysis
  if (analysis.connections) {
    analysis.connections.forEach((conn: any, index: number) => {
      edges.push({
        id: `edge_conn_${index}`,
        from: conn.from,
        to: conn.to,
        type: conn.type || 'leads_to',
        strength: conn.strength || 0.5
      });
    });
  }
  
  return {
    id: `mindmap_${segmentId}`,
    segmentId,
    title,
    nodes,
    edges,
    centralClaim: analysis.centralClaim || 'Main claim',
    summary: `Mind map with ${nodes.length} nodes and ${edges.length} connections`,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Create fallback mind map when AI parsing fails
 */
function createFallbackMindMap(segmentId: string, content: string, title: string): LocalMindMap {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const centralClaim = sentences[0]?.trim() || title;
  
  const nodes: MindMapNode[] = [
    {
      id: 'central',
      label: 'Central Claim',
      type: 'central_claim',
      content: centralClaim,
      level: 0,
      color: '#e74c3c',
      size: 30
    }
  ];
  
  const edges: MindMapEdge[] = [];
  
  // Add a few key sentences as supporting nodes
  sentences.slice(1, 4).forEach((sentence, index) => {
    const nodeId = `fallback_${index}`;
    nodes.push({
      id: nodeId,
      label: `Point ${index + 1}`,
      type: 'supporting_argument',
      content: sentence.trim(),
      level: 1,
      parentId: 'central',
      color: '#27ae60',
      size: 20
    });
    
    edges.push({
      id: `edge_${nodeId}_central`,
      from: nodeId,
      to: 'central',
      type: 'supports',
      strength: 0.5
    });
  });
  
  return {
    id: `mindmap_${segmentId}`,
    segmentId,
    title,
    nodes,
    edges,
    centralClaim,
    summary: `Fallback mind map with ${nodes.length} nodes`,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate meta mind map from multiple local maps
 */
export async function generateMetaMindMap(
  localMaps: LocalMindMap[],
  title: string,
  provider: 'openai' | 'anthropic' | 'deepseek' | 'perplexity' = 'deepseek'
): Promise<MetaMindMap> {
  
  // Extract central claims and key concepts
  const centralClaims = localMaps.map(map => ({
    id: map.id,
    claim: map.centralClaim,
    title: map.title
  }));
  
  const allConcepts = localMaps.flatMap(map => 
    map.nodes.filter(node => node.type === 'concept' || node.type === 'central_claim')
      .map(node => ({ 
        content: node.content, 
        mapId: map.id,
        type: node.type 
      }))
  );
  
  const prompt = `You are analyzing the global structure of a philosophical text. Below are the central claims and key concepts from different sections. Identify the overarching themes, conceptual clusters, and logical dependencies.

Central Claims:
${centralClaims.map(claim => `- ${claim.title}: ${claim.claim}`).join('\n')}

Key Concepts:
${allConcepts.map(concept => `- ${concept.content} (from ${concept.mapId})`).join('\n')}

Return a JSON object with this structure:
{
  "globalThemes": ["Theme 1", "Theme 2"],
  "conceptualClusters": {
    "Cluster Name": ["concept1", "concept2"]
  },
  "dependencies": [
    {
      "from": "map_id_1",
      "to": "map_id_2", 
      "type": "leads_to",
      "explanation": "How one section leads to another"
    }
  ],
  "contrasts": [
    {
      "between": ["map_id_1", "map_id_2"],
      "explanation": "How these sections contrast"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object.`;

  let aiResponse;
  switch (provider) {
    case 'openai':
      aiResponse = await openaiService.generateChatResponse(prompt, "", []);
      break;
    case 'anthropic':
      aiResponse = await anthropicService.generateChatResponse(prompt, "", []);
      break;
    case 'perplexity':
      aiResponse = await perplexityService.generateChatResponse(prompt, "", []);
      break;
    case 'deepseek':
    default:
      aiResponse = await deepseekService.generateChatResponse(prompt, "", []);
      break;
  }

  if (aiResponse.error) {
    throw new Error(`Failed to generate meta mind map: ${aiResponse.error}`);
  }

  try {
    let jsonContent = aiResponse.message.trim();
    jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const startIndex = jsonContent.indexOf('{');
    const lastIndex = jsonContent.lastIndexOf('}');
    
    if (startIndex !== -1 && lastIndex !== -1) {
      jsonContent = jsonContent.substring(startIndex, lastIndex + 1);
    }
    
    const analysis = JSON.parse(jsonContent);
    
    return convertToMetaMindMap(localMaps, title, analysis);
    
  } catch (error) {
    console.error('Failed to parse meta analysis:', error);
    return createFallbackMetaMindMap(localMaps, title);
  }
}

/**
 * Convert analysis to meta mind map
 */
function convertToMetaMindMap(localMaps: LocalMindMap[], title: string, analysis: any): MetaMindMap {
  const nodes: MindMapNode[] = [];
  const edges: MindMapEdge[] = [];
  
  // Create nodes for each local map
  localMaps.forEach((map, index) => {
    nodes.push({
      id: map.id,
      label: map.title,
      type: 'central_claim',
      content: map.centralClaim,
      level: 1,
      color: `hsl(${index * 137.5 % 360}, 70%, 60%)`,
      size: 25
    });
  });
  
  // Add theme nodes
  if (analysis.globalThemes) {
    analysis.globalThemes.forEach((theme: string, index: number) => {
      nodes.push({
        id: `theme_${index}`,
        label: theme,
        type: 'concept',
        content: `Global theme: ${theme}`,
        level: 0,
        color: '#34495e',
        size: 35
      });
    });
  }
  
  // Add dependencies as edges
  if (analysis.dependencies) {
    analysis.dependencies.forEach((dep: any, index: number) => {
      edges.push({
        id: `dep_${index}`,
        from: dep.from,
        to: dep.to,
        type: dep.type || 'leads_to',
        label: dep.explanation?.substring(0, 30) + '...' || '',
        strength: 0.8
      });
    });
  }
  
  return {
    id: `meta_${Date.now()}`,
    title,
    nodes,
    edges,
    localMaps: localMaps.map(map => map.id),
    globalThemes: analysis.globalThemes || [],
    conceptualClusters: analysis.conceptualClusters || {},
    generatedAt: new Date().toISOString()
  };
}

/**
 * Create fallback meta mind map
 */
function createFallbackMetaMindMap(localMaps: LocalMindMap[], title: string): MetaMindMap {
  const nodes: MindMapNode[] = [];
  const edges: MindMapEdge[] = [];
  
  // Create nodes for each local map
  localMaps.forEach((map, index) => {
    nodes.push({
      id: map.id,
      label: map.title,
      type: 'central_claim',
      content: map.centralClaim,
      level: 1,
      color: `hsl(${index * 137.5 % 360}, 70%, 60%)`,
      size: 25
    });
    
    // Connect sequential maps
    if (index > 0) {
      edges.push({
        id: `seq_${index}`,
        from: localMaps[index - 1].id,
        to: map.id,
        type: 'leads_to',
        strength: 0.5
      });
    }
  });
  
  return {
    id: `meta_${Date.now()}`,
    title,
    nodes,
    edges,
    localMaps: localMaps.map(map => map.id),
    globalThemes: ['Sequential Development'],
    conceptualClusters: {},
    generatedAt: new Date().toISOString()
  };
}