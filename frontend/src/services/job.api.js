import { request, requestAuthed } from './http';

const jobApi = {
    listJobs({ page = 1, limit = 20, source, role, q = '', all = false } = {}) {
        const params = new URLSearchParams({ page, limit, q });
        if (source) params.set('source', source);
        if (role) params.set('role', role);
        if (all) params.set('all', 'true');
        return request(`/jobs?${params}`);
    },

    getJob(jobId) {
        return request(`/jobs/${jobId}`);
    },

    triggerCrawl(token, { source, role, limitPerSource } = {}) {
        return requestAuthed('/jobs/crawl/trigger', token, {
            method: 'POST',
            body: JSON.stringify({ source, role, limitPerSource }),
        });
    },

    getCrawlStatus(source) {
        const params = source ? `?source=${encodeURIComponent(source)}` : '';
        return request(`/jobs/crawl/status${params}`);
    },

    listRoles() {
        return request('/jobs/roles');
    },
};

export default jobApi;
