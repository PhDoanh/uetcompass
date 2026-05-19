// 1st day of March and August at midnight
const DEFAULT_CRON_SCHEDULE = '0 0 1 3,8 *';

const programs = [
    { // Công nghệ thông tin định hướng thị trường Nhật Bản (khoá QH-2022 trở đi)
		programId: 'IT-JAPAN',
		sources: {
			'program-overview': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-dinh-huong-thi-truong-nhat-ban-8/' },
			'program-outcomes': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-dinh-huong-thi-truong-nhat-ban-9/' },
			'program-courses': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-dinh-huong-thi-truong-nhat-ban-10/' },
		}
    },
    { // Công nghệ thông tin (khóa QH-2022 đến QH-2024)
        programId: 'IT',
        sources: {
            'program-overview': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-8/' },
            'program-outcomes': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-9/' },
            'program-courses': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-10/' },
        }
    },
    { // Công nghệ thông tin chất lượng cao (khoá QH-2022 trở đi)
        programId: 'IT-HIGH-QUALITY',
        sources: {
            'program-overview': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-chat-luong-cao-8/' },
            'program-outcomes': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-chat-luong-cao-9/' },
            'program-courses': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-chat-luong-cao-10/' },
        }
    },
    { // Khoa học máy tính (khoá QH-2022 đến QH-2024)
        programId: 'CS',
        sources: {
            'program-overview': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-khoa-hoc-may-tinh-19/' },
            'program-outcomes': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-khoa-hoc-may-tinh-20/' },
            'program-courses': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-khoa-hoc-may-tinh-21/' },
        }
    },
    { // Kỹ thuật máy tính (khoá QH-2022 đến QH-2024)
        programId: 'CE',
        sources: {
            'program-overview': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-ky-thuat-may-tinh-8/' },
            'program-outcomes': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-ky-thuat-may-tinh-9/' },
            'program-courses': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-ky-thuat-may-tinh-10/' },
        }
    },
    { // Hệ thống thông tin (khoá QH-2022 đến QH-2024)
        programId: 'IS',
        sources: {
            'program-overview': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-thong-thong-tin-19/' },
            'program-outcomes': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-thong-thong-tin-20/' },
            'program-courses': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-thong-thong-tin-21/' },
        }
    },
    { // Mạng máy tính và truyền thông dữ liệu (khoá QH-2023 và QH-2024)
        programId: 'CN',
        sources: {
            'program-overview': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-mang-may-tinh-va-truyen-thong-du-lieu-11/' },
            'program-outcomes': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-mang-may-tinh-va-truyen-thong-du-lieu-12/' },
            'program-courses': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-mang-may-tinh-va-truyen-thong-du-lieu-13/' },
        }
    },
];

const careerTracks = [
    {
		trackId: 'Backend Engineer',
		description: 'A backend engineering profile focused on server-side development, database management, and API design. Graduates are proficient in building scalable and secure backend systems using languages like Java, Python, or Node.js, and are familiar with cloud platforms and microservices architecture. Suitable for roles in both domestic Vietnamese IT companies and international product firms.',
	},
	{
		trackId: 'Software Engineer Japan',
        description: 'A software engineer profile oriented toward the Japanese IT market, where graduates work in Japanese or Japan-affiliated companies as BrSE, offshore developer, or on-site project member. Key differentiators include Japanese language proficiency (JLPT N3-N2), knowledge of Japanese business culture and ITSS standards, and experience from mandatory internships at Japanese partner companies.',
	},
	{
		trackId: 'Software Engineer General',
		description: 'A general software engineering profile covering the full development lifecycle — from requirements analysis and OOP design to testing, deployment, and project management. Graduates are versatile across frontend, backend, and full-stack roles at both domestic Vietnamese IT companies and international product firms.',
	},
	{
		trackId: 'AI Data Engineer',
		description: 'An AI and data-oriented profile built on elective courses in machine learning, NLP, image processing, and data mining, grounded in strong mathematical foundations (probability, statistics, linear algebra). Suited for roles such as ML engineer, data engineer, or AI application developer at product and research-oriented companies.',
	},
	{
		trackId: 'Systems Infrastructure',
		description: 'A systems and infrastructure profile covering computer architecture, operating systems, computer networks, embedded programming, and network security. Aligned with roles in systems programming, DevOps, embedded software, and cybersecurity at platform-level or hardware-adjacent companies.',
	},
	{
		trackId: 'Mobile App Developer',
		description: 'A mobile application development profile focused on building native or cross-platform apps, supported by dedicated mobile courses co-facilitated by Japanese tech industry experts. Graduates are proficient in OOP design patterns, mobile UI implementation, and backend API integration for Japanese or international clients.',
	},
	{
		trackId: 'Full Stack Web Developer',
		description: 'A full-stack web development profile covering frontend, backend, database management, and systems integration, with hands-on web project practicals involving Japanese IT industry experts. Particularly relevant for Vietnamese outsourcing companies serving Japanese clients and domestic product startups.',
	},
];

const skillVocabulary = [
    'javascript-nodejs',
    'python-backend',
    'ruby-backend',
    'go-backend',
    'cpp-backend',
    'csharp-backend',
    'rust-backend',
    'internet-fundamentals',
    'http-protocol',
    'domain-name',
    'dns-fundamentals',
    'browsers-how-work',
    'page-hosting-services',
    'shared-hosting',
    'vps-hosting',
    'dedicated-hosting',
    'server-architecture',
    'cdn',
    'server-side',
    'client-side',
    'version-control-systems',
    'git-vcs',
    'gitlab-vcs',
    'caching-layer',
    'redis-cache',
    'memcached',
    'mongodb-cache',
    'api-design',
    'rest-apis',
    'json-apis',
    'graphql-apis',
    'relational-databases',
    'postgresql-db',
    'mysql-db',
    'oracle-db',
    'sqlite-db',
    'authentication',
    'jwt-auth',
    'oauth-auth',
    'basic-auth',
    'session-auth',
    'web-security',
    'https-protocol',
    'dnssec',
    'csp-headers',
    'server-security',
    'testing',
    'unit-testing',
    'functional-testing',
    'integration-testing',
    'cicd-pipeline',
    'github-actions',
    'jenkins-ci',
    'gitlab-ci',
    'software-architecture',
    'architectural-patterns',
    'monolithic-apps',
    'microservices-arch',
    'containerization',
    'docker-basics',
    'lxc-containers',
    'orchestration-scaling',
    'kubernetes-basics',
    'load-balancing',
    'auto-scaling',
    'monitoring-observability',
    'server-monitoring',
    'application-logging',
    'distributed-tracing-advanced',
    'performance-optimization',
    'database-indexing',
    'query-optimization',
    'horizontal-scaling',
    'nosql-databases',
    'mongodb-nosql',
    'elasticsearch',
    'redis-nosql',
    'message-queues',
    'rabbitmq-queue',
    'kafka-queue',
    'advanced-topics',
    'service-mesh',
    'api-gateway',
    'serverless-computing',
];

module.exports = {
	programs,
	careerTracks,
	skillVocabulary,
	DEFAULT_CRON_SCHEDULE,
	cronSchedule: process.env.SEED_CRON_SCHEDULE || DEFAULT_CRON_SCHEDULE,
};
