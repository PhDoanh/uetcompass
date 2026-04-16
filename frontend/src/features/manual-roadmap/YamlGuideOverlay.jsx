import React, { useEffect, useState } from 'react';
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
     * Simple markdown to HTML renderer
     * Handles headings, paragraphs, lists, code blocks, tables
     */
    const renderMarkdown = (content) => {
        if (!content) return null;

        const lines = content.split('\n');
        const elements = [];
        let i = 0;
        let listActive = false;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            // Headings
            if (trimmed.startsWith('# ')) {
                if (listActive) {
                    elements.push(<ul key={`ul-${i}`} className="yaml-guide-list" />);
                    listActive = false;
                }
                elements.push(<h1 key={i} className="yaml-guide-h1">{trimmed.substring(2)}</h1>);
                i += 1;
                continue;
            }

            if (trimmed.startsWith('## ')) {
                if (listActive) {
                    elements.push(<ul key={`ul-${i}`} className="yaml-guide-list" />);
                    listActive = false;
                }
                elements.push(<h2 key={i} className="yaml-guide-h2">{trimmed.substring(3)}</h2>);
                i += 1;
                continue;
            }

            if (trimmed.startsWith('### ')) {
                if (listActive) {
                    elements.push(<ul key={`ul-${i}`} className="yaml-guide-list" />);
                    listActive = false;
                }
                elements.push(<h3 key={i} className="yaml-guide-h3">{trimmed.substring(4)}</h3>);
                i += 1;
                continue;
            }

            // Code blocks
            if (trimmed.startsWith('```')) {
                let codeContent = '';
                i += 1;
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    codeContent += lines[i] + '\n';
                    i += 1;
                }
                elements.push(
                    <pre key={i} className="yaml-guide-code-block">
                        <code>{codeContent.trimEnd()}</code>
                    </pre>
                );
                i += 1;
                continue;
            }

            // Lists
            if (trimmed.startsWith('- ')) {
                elements.push(
                    <li key={i} className="yaml-guide-li">
                        {trimmed.substring(2)}
                    </li>
                );
                listActive = true;
                i += 1;
                continue;
            }

            if (trimmed.startsWith('| ') && trimmed.includes('|')) {
                // Table row
                const cells = trimmed.split('|').map(cell => cell.trim()).filter(Boolean);
                elements.push(
                    <div key={i} className="yaml-guide-table-row">
                        {cells.map((cell, idx) => (
                            <span key={idx} className="yaml-guide-table-cell">{cell}</span>
                        ))}
                    </div>
                );
                i += 1;
                continue;
            }

            // Empty lines
            if (trimmed === '') {
                if (listActive) {
                    listActive = false;
                }
                i += 1;
                continue;
            }

            // Regular paragraphs
            if (listActive) {
                listActive = false;
            }
            elements.push(
                <p key={i} className="yaml-guide-p">
                    {trimmed}
                </p>
            );
            i += 1;
        }

        return elements;
    };

    return (
        <div className="yaml-guide-overlay" onClick={onClose}>
            <div className="yaml-guide-modal" onClick={(e) => e.stopPropagation()}>
                <div className="yaml-guide-header">
                    <h2 className="yaml-guide-title">YAML Format Guide</h2>
                    <button className="yaml-guide-close" onClick={onClose} aria-label="Close guide">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="yaml-guide-content">
                    {isLoading ? (
                        <div className="yaml-guide-loading">
                            <span className="material-symbols-outlined spinning">refresh</span>
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
