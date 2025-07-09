**DOCUMENT TITLE: Comprehensive Mind Map Functionality Specification for Replit Agent**

---

### **I. Mind Map Types: Definitions + Examples**

#### **1. Radial Mind Map (Classic)**
- **Structure**: Central concept in the middle; ideas branch out radially.
- **Purpose**: Idea generation, concept expansion.
- **Example Input Text**:
  > "Language is central to philosophy. It allows expression of thoughts, clarification of meaning, and transmission of knowledge."
- **Corresponding Radial Map**:
  - Central: Language
    - Expression of thoughts
    - Clarification of meaning
    - Transmission of knowledge

#### **2. Tree (Hierarchical) Mind Map**
- **Structure**: Top-down, parent → child → sub-child.
- **Purpose**: Show structure, organization, argument flow.
- **Example Input Text**:
  > "Philosophy splits into metaphysics and epistemology. Metaphysics includes ontology and cosmology. Epistemology includes empiricism and rationalism."
- **Tree Map**:
  - Philosophy
    - Metaphysics
      - Ontology
      - Cosmology
    - Epistemology
      - Empiricism
      - Rationalism

#### **3. Flowchart Map**
- **Structure**: Linear or branched flow of steps; process-based.
- **Purpose**: Show causality or sequences.
- **Example**:
  > "Input → Process → Output."
- **Map**:
  - Input → Process → Output

#### **4. Concept Map**
- **Structure**: Web of related concepts with **labeled relationships**.
- **Purpose**: Highlight conceptual connections.
- **Example**:
  > "Wittgenstein's Tractatus relates language to reality, thought, and logic. Logic determines valid expression."
- **Map**:
  - Tractatus — relates to → Language, Reality, Thought
  - Logic — determines → Valid expression

#### **5. Argument Map**
- **Structure**: Premises, objections, rebuttals, conclusions.
- **Purpose**: Analyze reasoning.
- **Example**:
  > "The world is the totality of facts, not things. Therefore, language must express facts. Objection: some language is fictional. Rebuttal: fictional statements simulate fact-structure."
- **Map**:
  - Claim: World = facts
    - Therefore → Language = fact-expression
    - Objection → Fictional language exists
    - Rebuttal → Fiction simulates facts

---

### **II. Universal Mind Map Generator Requirements**

Replit must implement a dynamic, flexible mind map system with the following features:

#### **1. Map Type Selection**
- User can select from:
  - Radial
  - Tree
  - Flowchart
  - Concept
  - Argument
- The map type must be selectable before or after generating the first version.

#### **2. Source Text Selection**
User can:
- Highlight any text on screen and generate a mind map just for that portion.
- OR choose chunks from a popup list of auto-chunked segments (e.g., from LLM chunking engine).

There are **no size presets** (e.g., micro/meso/macro); the user defines the scope.

#### **3. Recursivity (Regenerative Mind Mapping)**
- Inside the mind map popup, the user must have the option to:
  - Give written feedback or clarifications (text box)
  - Ask to refine or regenerate the map based on critique
  - Continue recursively until satisfied

#### **4. Output Options**
- The mind map must be downloadable as:
  - JPG
  - PNG
  - PDF
- The user must also be able to send it via email using **SendGrid** integration

#### **5. Technical Implementation Notes**
- Use libraries like `vis.js`, `react-flow`, `cytoscape.js`, or equivalent for visual generation.
- All visuals must render dynamically in-browser with full interactivity (zoom, drag, node click).
- Edge labels must be supported (e.g., "supports," "contradicts").
- Style nodes by function: Central / Supporting / Objection / Example / Implication

---

### **Summary**
This document defines all supported mind map types with real examples and specifies a flexible, recursive, user-controlled mind map system for integration into the Living Book app and other contexts. All outputs must be exportable and user-modifiable. Recursive feedback is required to ensure quality.

No hardcoded scale limits. No flattened box layouts. This must be a genuine visual mapping system that helps the user see and refine conceptual structure.

