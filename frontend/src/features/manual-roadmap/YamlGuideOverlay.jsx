import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import '../../style/general-component.css';
import './yaml-guide-overlay.css';

/**
 * YamlGuideOverlay - displays YAML format guide in a modal overlay
 * Loads guild.md from the specs folder and renders it as formatted HTML
 */
export default function YamlGuideOverlay({ isOpen, onClose }) {
    const [guideContent, setGuideContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const loadGuide = async () => {
            setIsLoading(true);
            try {
                // Import the YAML_FORMAT_GUIDE.md file from the same folder
                const guideModule = await import('./YAML_FORMAT_GUIDE.md?raw');
                setGuideContent(guideModule.default || '');
            } catch (err) {
                console.error('Failed to load YAML format guide:', err);
                setGuideContent('# Error Loading Guide\n\nFailed to load the YAML format guide. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        loadGuide();
    }, [isOpen]);

    if (!isOpen) return null;

    /**
     * Enhanced markdown to HTML renderer with better formatting
     * Handles headings, paragraphs, lists, code blocks, tables with proper HTML
     */
    const renderMarkdown = (content) => {
        if (!content) return null;

        const lines = content.split('\n');
        const elements = [];
        let i = 0;
        let listItems = [];
        let tableRows = [];
        let inTable = false;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            // Flush pending list
            if (listItems.length > 0 && !trimmed.startsWith('- ')) {
                elements.push(
                    <ul key={`ul-${i}`} className="yaml-guide-list">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="yaml-guide-li">{item}</li>
                        ))}
                    </ul>
                );
                listItems = [];
            }

            // Flush pending table
            if (tableRows.length > 0 && !(trimmed.startsWith('| ') && trimmed.includes('|'))) {
                const headerRow = tableRows[0];
                const bodyRows = tableRows.slice(2); // Skip header and separator
                elements.push(
                    <table key={`table-${i}`} className="yaml-guide-table">
                        <thead>
                            <tr>
                                {headerRow.map((cell, idx) => (
                                    <th key={idx} className="yaml-guide-table-header">{cell}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bodyRows.map((row, ridx) => (
                                <tr key={ridx} className="yaml-guide-table-body-row">
                                    {row.map((cell, cidx) => (
                                        <td key={cidx} className="yaml-guide-table-data">{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
                tableRows = [];
                inTable = false;
            }

            // Headings
            if (trimmed.startsWith('# ')) {
                elements.push(
                    <div key={i} className="yaml-guide-section-divider" />
                );
                elements.push(
                    <h1 key={`h1-${i}`} className="yaml-guide-h1">
                        {trimmed.substring(2)}
                    </h1>
                );
                i += 1;
                continue;
            }

            if (trimmed.startsWith('## ')) {
                elements.push(
                    <h2 key={`h2-${i}`} className="yaml-guide-h2">
                        {trimmed.substring(3)}
                    </h2>
                );
                i += 1;
                continue;
            }

            if (trimmed.startsWith('### ')) {
                elements.push(
                    <h3 key={`h3-${i}`} className="yaml-guide-h3">
                        {trimmed.substring(4)}
                    </h3>
                );
                i += 1;
                continue;
            }

            // Code blocks
            if (trimmed.startsWith('```')) {
                let codeContent = '';
                let language = trimmed.substring(3).trim();
                i += 1;
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    codeContent += lines[i] + '\n';
                    i += 1;
                }
                elements.push(
                    <pre key={`code-${i}`} className="yaml-guide-code-block">
                        <code className={`language-${language || 'yaml'}`}>
                            {codeContent.trimEnd()}
                        </code>
                    </pre>
                );
                i += 1;
                continue;
            }

            // Tables
            if (trimmed.startsWith('| ') && trimmed.includes('|')) {
                const cells = trimmed.split('|')
                    .map(cell => cell.trim())
                    .filter(Boolean);

                if (!inTable) {
                    inTable = true;
                }
                tableRows.push(cells);
                i += 1;
                continue;
            }

            // Lists
            if (trimmed.startsWith('- ')) {
                listItems.push(trimmed.substring(2));
                i += 1;
                continue;
            }

            // Horizontal rules (---)
            if (trimmed === '---') {
                elements.push(
                    <hr key={`hr-${i}`} className="yaml-guide-hr" />
                );
                i += 1;
                continue;
            }

            // Empty lines
            if (trimmed === '') {
                i += 1;
                continue;
            }

            // Regular paragraphs
            elements.push(
                <p key={`p-${i}`} className="yaml-guide-p">
                    {trimmed}
                </p>
            );
            i += 1;
        }

        // Flush remaining lists and tables
        if (listItems.length > 0) {
            elements.push(
                <ul key="final-ul" className="yaml-guide-list">
                    {listItems.map((item, idx) => (
                        <li key={idx} className="yaml-guide-li">{item}</li>
                    ))}
                </ul>
            );
        }

        if (tableRows.length > 0) {
            const headerRow = tableRows[0];
            const bodyRows = tableRows.slice(2);
            elements.push(
                <table key="final-table" className="yaml-guide-table">
                    <thead>
                        <tr>
                            {headerRow.map((cell, idx) => (
                                <th key={idx} className="yaml-guide-table-header">{cell}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {bodyRows.map((row, ridx) => (
                            <tr key={ridx} className="yaml-guide-table-body-row">
                                {row.map((cell, cidx) => (
                                    <td key={cidx} className="yaml-guide-table-data">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        return elements;
    };

    return (
        <div className="yaml-guide-overlay" onClick={onClose}>
            <div className="yaml-guide-modal" onClick={(e) => e.stopPropagation()}>
                <div className="yaml-guide-header">
                    <h2 className="yaml-guide-title">YAML Format Guide</h2>
                    <button className="yaml-guide-close" onClick={onClose} aria-label="Close guide">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="yaml-guide-content">
                    {isLoading ? (
                        <div className="yaml-guide-loading">
                            <RefreshCw className="spinning" size={28} aria-hidden="true" />
                            <p>Loading guide...</p>
                        </div>
                    ) : (
                        <div className="yaml-guide-markdown">
                            {renderMarkdown(guideContent)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
