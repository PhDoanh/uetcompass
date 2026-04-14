# Quickstart: Manual Roadmap Generator

## Overview
Create custom learning roadmaps using YAML structured code, visualize as interactive graphs, and share with the community.

## Prerequisites
- User account in UETCompass
- Basic understanding of YAML syntax

## Step-by-Step Guide

### 1. Access the Roadmap Generator
1. Log in to UETCompass
2. Navigate to `/manual-roadmap` in your browser
3. Or click "Start Creating" on any roadmap suggestion card on the homepage

### 2. Define Your Roadmap Structure
Use the Monaco YAML editor on the left to define your roadmap:

```yaml
title: Software Engineering Roadmap
description: Complete path for software engineering students
nodes:
  - nodeId: MATH101
    label: Discrete Mathematics
  - nodeId: CS101
    label: Introduction to Computer Science
    prerequisites: [MATH101]
  - nodeId: CS201
    label: Data Structures
    prerequisites: [CS101]
  - nodeId: CS301
    label: Algorithms
    prerequisites: [CS201]
```

**Node Properties:**
- `nodeId`: Unique identifier (required)
- `label`: Display name (required)
- `description`: Optional details
- `prerequisites`: Array of nodeIds this node depends on
- `status`: One of `locked`, `pending`, `in_progress`, `done` (default: pending)
- `skills`: Array of skill names
- `metadata`: Additional custom data

### 3. Preview the Graph
- The React Flow graph automatically updates on the right as you type
- See prerequisite relationships as directed edges
- Nodes are topologically sorted for logical flow
- Hover over nodes for details

### 4. Validate and Save
1. The editor shows validation errors in real-time
2. Check for YAML syntax, DAG cycles, and schema compliance
3. Click "Save Draft" to store your work privately
4. Or "Save Changes" if editing an existing roadmap

### 5. Share with Community
1. Click "Share to Community" to publish your roadmap
2. It becomes visible in the "Community Roadmaps" section on the homepage
3. Community members can view but not edit your shared roadmaps

### 6. Edit Existing Roadmaps
1. Load a roadmap by adding `?id=<roadmapId>` to the URL
2. Modify the YAML and save changes
3. Only draft roadmaps can be edited; published ones create new versions

## Tips
- Keep YAML under 10KB for performance
- Use meaningful nodeIds and labels
- Test complex prerequisite chains
- Share roadmaps to inspire others
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