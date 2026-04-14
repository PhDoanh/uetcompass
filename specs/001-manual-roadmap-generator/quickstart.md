# Quickstart: Manual Roadmap Generator

## Overview
Create custom learning roadmaps using YAML structured code, visualize as interactive graphs, and share with the community.

## Prerequisites
- User account in UETCompass
- Basic understanding of YAML syntax

## Step-by-Step Guide

### 1. Access the Roadmap Generator
1. Log in to UETCompass
2. Navigate to "Roadmap Generator" from the main menu
3. Click "Create New Roadmap"

### 2. Define Your Roadmap Structure
Use the YAML editor on the left to define your roadmap:

```yaml
title: Software Engineering Roadmap
description: Complete path for software engineering students
nodes:
  - id: MATH101
    label: Discrete Mathematics
  - id: CS101
    label: Introduction to Computer Science
    prerequisites: [MATH101]
  - id: CS201
    label: Data Structures
    prerequisites: [CS101]
  - id: CS301
    label: Algorithms
    prerequisites: [CS201]
```

### 3. Preview the Graph
- The graph automatically updates on the right as you type
- See prerequisite relationships as connected nodes
- Click nodes to view details
- Resize the split-pane for better visibility

### 4. Validate and Save
1. Click "Validate" to check for errors
2. Fix any syntax or structural issues
3. Click "Save Roadmap" to store your work

### 5. Share with Community
1. Click "Share" to make your roadmap public
2. Get a shareable link
3. View in the community section

## YAML Schema Reference

### Required Fields
- `title`: string (1-200 characters)
- `nodes`: array of node objects

### Node Structure
- `id`: unique string identifier
- `label`: display name
- `prerequisites`: array of node IDs (optional)

### Example Advanced Roadmap
```yaml
title: Full-Stack Development
nodes:
  - id: HTML
    label: HTML & CSS
  - id: JS
    label: JavaScript Fundamentals
    prerequisites: [HTML]
  - id: REACT
    label: React Framework
    prerequisites: [JS]
  - id: NODE
    label: Node.js Backend
    prerequisites: [JS]
  - id: DB
    label: Database Design
  - id: FULLSTACK
    label: Full-Stack Integration
    prerequisites: [REACT, NODE, DB]
```

## Tips
- Start with simple roadmaps and add complexity
- Use meaningful IDs and labels
- Test prerequisites to avoid cycles
- Save frequently during editing
- Share completed roadmaps for community feedback

## Troubleshooting
- **YAML syntax error**: Check indentation and quotes
- **Graph not updating**: Ensure YAML is valid
- **Save failed**: Check network connection and try again
- **Share not working**: Validate roadmap first