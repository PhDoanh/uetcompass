import React from 'react';
import Editor from '@monaco-editor/react';

export default function ManualRoadmapEditor({ title, description, yamlCode, onChangeTitle, onChangeDescription, onChangeYaml, validationError }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
                    <strong>Title</strong>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => onChangeTitle(e.target.value)}
                        placeholder="Set the title"
                        style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc', marginTop: 8 }}
                    />
                </div>
                <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
                    <strong>Description</strong>
                    <textarea
                        value={description}
                        onChange={(e) => onChangeDescription(e.target.value)}
                        placeholder="Set the description"
                        rows={2}
                        style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #ccc', marginTop: 8, resize: 'vertical' }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Roadmap YAML</strong>
                    <span style={{ color: '#666', fontSize: 12 }}>Max 10KB</span>
                </div>
                <Editor
                    height="420px"
                    defaultLanguage="yaml"
                    value={yamlCode}
                    onChange={onChangeYaml}
                    options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                />
                {validationError ? (
                    <div style={{ color: '#b71c1c', background: '#ffebee', padding: 12, borderRadius: 8 }}>
                        {validationError}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
