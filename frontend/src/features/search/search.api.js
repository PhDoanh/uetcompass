export async function searchKeyword(keyword) {
  const payload = { keyword };

  const response = await fetch('/api/search/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || 'Search failed');
  }

  return response.json();
}
