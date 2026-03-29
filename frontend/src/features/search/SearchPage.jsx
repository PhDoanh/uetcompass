import { useState } from 'react';
import { searchKeyword } from './search.api';

export default function SearchPage() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const data = await searchKeyword(input);
            setResults(data);
        } catch (err) {
            setError(err.message || 'Search failed');
            setResults(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ margin: '16px' }}>
            <h2>Simple Search</h2>
            <form onSubmit={handleSearch} style={{ marginBottom: '12px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Search courses and skills..."
                    style={{ width: '80%', padding: '8px', marginRight: '8px' }}
                />
                <button type="submit" disabled={!input.trim() || loading}>
                    {loading ? 'Searching…' : 'Search'}
                </button>
            </form>

            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {results && (
                <div>
                    <h3>Results for "{results.query}"</h3>

                    <div style={{ marginBottom: '16px' }}>
                        <h4>Courses</h4>
                        {results.courses.length > 0 ? (
                            <ul>
                                {results.courses.map((course) => (
                                    <li key={course.courseId}>{course.code} - {course.name}</li>
                                ))}
                            </ul>
                        ) : (
                            <p>No matching courses.</p>
                        )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <h4>Skills</h4>
                        {results.skills.length > 0 ? (
                            <ul>
                                {results.skills.map((skill) => (
                                    <li key={skill.skillId}>{skill.name} ({skill.domain})</li>
                                ))}
                            </ul>
                        ) : (
                            <p>No matching skills.</p>
                        )}
                    </div>

                    {results.tags && results.tags.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <h4>Tags</h4>
                            <ul>
                                {results.tags.map((tag) => (
                                    <li key={tag.tagId}>{tag.name}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {results.source && <small>Source: {results.source}</small>}
                </div>
            )}
        </div>
    );
}
