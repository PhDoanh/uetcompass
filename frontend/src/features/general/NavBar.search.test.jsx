describe('NavBar roadmap search behavior scaffold', () => {
    test('search bar click should open search overlay on normal pages', async () => {
        const { getRoadmapSearchTarget } = await import('./NavBar.jsx');
        expect(getRoadmapSearchTarget('/')).toBe(true);
    });

    test('auth popup pages should block search overlay opening', async () => {
        const { getRoadmapSearchTarget } = await import('./NavBar.jsx');
        expect(getRoadmapSearchTarget('/login')).toBe(false);
    });
});
