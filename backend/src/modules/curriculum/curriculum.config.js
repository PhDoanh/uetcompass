// 1st day of March and August at midnight
const DEFAULT_CRON_SCHEDULE = '0 0 1 3,8 *';

const programs = [
	{
		programId: 'IT-JAPAN',
		sources: {
			'program-overview': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-dinh-huong-thi-truong-nhat-ban-8/' },
			'program-outcomes': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-dinh-huong-thi-truong-nhat-ban-9/' },
			'program-courses': { url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-dinh-huong-thi-truong-nhat-ban-10/' },
		}
	},
];

const careerTracks = [
	{
		trackId: 'software-engineer-japan',
		description: 'A software engineer profile oriented toward the Japanese IT market, where graduates work in Japanese or Japan-affiliated companies as BrSE, offshore developer, or on-site project member. Key differentiators include Japanese language proficiency (JLPT N3–N2), knowledge of Japanese business culture and ITSS standards, and experience from mandatory internships at Japanese partner companies.',
	},
	{
		trackId: 'software-engineer-general',
		description: 'A general software engineering profile covering the full development lifecycle — from requirements analysis and OOP design to testing, deployment, and project management. Graduates are versatile across frontend, backend, and full-stack roles at both domestic Vietnamese IT companies and international product firms.',
	},
	{
		trackId: 'ai-data-engineer',
		description: 'An AI and data-oriented profile built on elective courses in machine learning, NLP, image processing, and data mining, grounded in strong mathematical foundations (probability, statistics, linear algebra). Suited for roles such as ML engineer, data engineer, or AI application developer at product and research-oriented companies.',
	},
	{
		trackId: 'systems-infrastructure',
		description: 'A systems and infrastructure profile covering computer architecture, operating systems, computer networks, embedded programming, and network security. Aligned with roles in systems programming, DevOps, embedded software, and cybersecurity at platform-level or hardware-adjacent companies.',
	},
	{
		trackId: 'mobile-app-developer',
		description: 'A mobile application development profile focused on building native or cross-platform apps, supported by dedicated mobile courses co-facilitated by Japanese tech industry experts. Graduates are proficient in OOP design patterns, mobile UI implementation, and backend API integration for Japanese or international clients.',
	},
	{
		trackId: 'full-stack-web-developer',
		description: 'A full-stack web development profile covering frontend, backend, database management, and systems integration, with hands-on web project practicals involving Japanese IT industry experts. Particularly relevant for Vietnamese outsourcing companies serving Japanese clients and domestic product startups.',
	},
];

const skillVocabulary = [
    // CS Foundations
    'oop',
    'data-structures',
    'algorithms',
    'discrete-mathematics',
    'linear-algebra',
    'calculus',
    'probability-and-statistics',
    'computer-architecture',

    // Systems & Infrastructure
    'linux',
    'operating-systems',
    'networking',
    'network-security',
    'embedded-systems',
    'real-time-programming',
    'signal-and-systems',

    // Software Engineering
    'software-engineering',
    'requirements-analysis',
    'object-oriented-analysis-and-design',
    'software-architecture',
    'design-patterns',
    'software-testing-and-qa',
    'software-project-management',
    'ui-ux-design',
    'version-control',

    // Data & AI
    'sql',
    'database-management-systems',
    'data-mining',
    'machine-learning',
    'natural-language-processing',
    'image-processing',
    'artificial-intelligence',

    // Web & Mobile
    'web-development',
    'mobile-app-development',
    'restful-api-design',
    'e-commerce-systems',

    // Japanese Market & Cross-cutting
    'japanese-language-technical',
    'japanese-business-culture',
    'itss-competency-standards',
    'bridge-se-communication',
    'it-project-internship',
    'entrepreneurship-and-startup',
];

module.exports = {
	programs,
	careerTracks,
	skillVocabulary,
	DEFAULT_CRON_SCHEDULE,
	cronSchedule: process.env.SEED_CRON_SCHEDULE || DEFAULT_CRON_SCHEDULE,
};
