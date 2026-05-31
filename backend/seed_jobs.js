'use strict';

const mongoose = require('mongoose');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uetcompass';

const jobSeed = [
    {
        sourceCode: 'topdev',
        title: 'Backend Engineer (Node.js)',
        companyName: 'Teko Vietnam',
        companyLogoUrl: '',
        city: 'Hà Nội',
        location: 'Hà Nội',
        salaryText: '15 - 25 triệu',
        experienceText: '0 - 1 năm',
        workingMode: 'On-site',
        skills: ['Node.js', 'Express', 'MongoDB', 'Docker'],
        description: 'Phát triển và duy trì các API backend cho hệ thống thương mại điện tử quy mô lớn.',
        requirements: 'Fresher/Junior backend developer với kinh nghiệm 0-1 năm. Biết Node.js, Express, MongoDB.',
        responsibilities: 'Xây dựng REST API, tối ưu hiệu năng hệ thống, review code.',
        benefits: 'Lương cạnh tranh, BHXH đầy đủ, review lương 2 lần/năm.',
        applyUrl: 'https://topdev.vn/detail-jobs/backend-engineer-nodejs-teko',
        jobUrl: 'https://topdev.vn/detail-jobs/backend-engineer-nodejs-teko',
        isTargetJob: true,
        score: 75,
        contentHash: 'seed_hash_001',
    },
    {
        sourceCode: 'topdev',
        title: 'Junior Backend Developer (Java Spring Boot)',
        companyName: 'FPT Software',
        companyLogoUrl: '',
        city: 'Hà Nội',
        location: 'Hà Nội',
        salaryText: '10 - 18 triệu',
        experienceText: '1 năm',
        workingMode: 'Hybrid',
        skills: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
        description: 'Tham gia phát triển hệ thống backend cho dự án outsource Nhật Bản.',
        requirements: 'Junior developer, biết Java Spring Boot. Ưu tiên fresher có dự án thực tế.',
        responsibilities: 'Implement API theo spec, viết unit test, tham gia daily standup.',
        benefits: 'Môi trường chuyên nghiệp, đào tạo kỹ thuật, du lịch hằng năm.',
        applyUrl: 'https://topdev.vn/detail-jobs/junior-backend-java-fpt',
        jobUrl: 'https://topdev.vn/detail-jobs/junior-backend-java-fpt',
        isTargetJob: true,
        score: 60,
        contentHash: 'seed_hash_002',
    },
    {
        sourceCode: 'topdev',
        title: 'Backend Intern - Python/Django',
        companyName: 'VNG Corporation',
        companyLogoUrl: '',
        city: 'Hà Nội',
        location: 'Hà Nội',
        salaryText: '5 - 8 triệu',
        experienceText: 'Không yêu cầu kinh nghiệm',
        workingMode: 'On-site',
        skills: ['Python', 'Django', 'PostgreSQL', 'Git'],
        description: 'Thực tập sinh backend tham gia xây dựng tính năng cho sản phẩm gaming của VNG.',
        requirements: 'Sinh viên năm 3-4, biết Python, Django cơ bản. Có thể đi làm 4-5 ngày/tuần.',
        responsibilities: 'Hỗ trợ team phát triển API, fix bug, viết tài liệu kỹ thuật.',
        benefits: 'Phụ cấp 5-8 triệu/tháng, được mentoring trực tiếp từ senior engineer.',
        applyUrl: 'https://topdev.vn/detail-jobs/backend-intern-python-vng',
        jobUrl: 'https://topdev.vn/detail-jobs/backend-intern-python-vng',
        isTargetJob: true,
        score: 100,
        contentHash: 'seed_hash_003',
    },
    {
        sourceCode: 'itviec',
        title: 'Fresher Backend Developer (.NET)',
        companyName: 'Nashtech Vietnam',
        companyLogoUrl: '',
        city: 'Hà Nội',
        location: 'Hà Nội',
        salaryText: 'Thỏa thuận',
        experienceText: 'Fresher',
        workingMode: 'On-site',
        skills: ['.NET', 'C#', 'SQL Server', 'REST API'],
        description: 'Cơ hội cho fresher .NET tham gia dự án cho khách hàng UK.',
        requirements: 'Fresher với nền tảng .NET/C#. Tiếng Anh đọc hiểu tài liệu kỹ thuật.',
        responsibilities: 'Phát triển module backend, tham gia code review, học công nghệ mới.',
        benefits: 'Training .NET nâng cao, chứng chỉ Microsoft, lương tháng 13.',
        applyUrl: 'https://itviec.com/it-jobs/fresher-backend-developer-net-nashtech',
        jobUrl: 'https://itviec.com/it-jobs/fresher-backend-developer-net-nashtech',
        isTargetJob: true,
        score: 65,
        contentHash: 'seed_hash_004',
    },
    {
        sourceCode: 'topcv',
        title: 'Lập trình viên Backend Node.js (Fresher/Junior)',
        companyName: 'KMS Technology',
        companyLogoUrl: '',
        city: 'Hà Nội',
        location: 'Hà Nội',
        salaryText: '12 - 20 triệu',
        experienceText: '0 - 2 năm',
        workingMode: 'Hybrid',
        skills: ['Node.js', 'TypeScript', 'GraphQL', 'AWS'],
        description: 'Phát triển microservices cho nền tảng SaaS của khách hàng Mỹ.',
        requirements: 'Fresher hoặc junior có dự án portfolio. Biết Node.js/TypeScript là lợi thế.',
        responsibilities: 'Build microservice, viết unit test (>80% coverage), tham gia design review.',
        benefits: 'MacBook Pro, WFH thứ 6, budget học tập $500/năm.',
        applyUrl: 'https://www.topcv.vn/viec-lam/lap-trinh-vien-backend-nodejs-kms',
        jobUrl: 'https://www.topcv.vn/viec-lam/lap-trinh-vien-backend-nodejs-kms',
        isTargetJob: true,
        score: 55,
        contentHash: 'seed_hash_005',
    },
    {
        sourceCode: 'joboko',
        title: 'Thực tập sinh Lập trình Backend (Go)',
        companyName: 'Trusting Social',
        companyLogoUrl: '',
        city: 'Hà Nội',
        location: 'Hà Nội',
        salaryText: '6 - 10 triệu',
        experienceText: 'Không yêu cầu kinh nghiệm',
        workingMode: 'On-site',
        skills: ['Go', 'gRPC', 'PostgreSQL', 'Kubernetes'],
        description: 'Thực tập tại công ty fintech, làm việc trực tiếp với hệ thống xử lý dữ liệu lớn.',
        requirements: 'Thực tập sinh CNTT, biết lập trình cơ bản, ham học hỏi. Ưu tiên biết Go hoặc Python.',
        responsibilities: 'Phát triển service nhỏ, viết script xử lý data, pair programming với senior.',
        benefits: 'Môi trường start-up năng động, có cơ hội được nhận chính thức sau 3 tháng.',
        applyUrl: 'https://vn.joboko.com/viec-lam-thuc-tap-sinh-backend-go-trusting',
        jobUrl: 'https://vn.joboko.com/viec-lam-thuc-tap-sinh-backend-go-trusting',
        isTargetJob: true,
        score: 90,
        contentHash: 'seed_hash_006',
    },
    {
        sourceCode: 'topdev',
        title: 'Backend Developer (Ruby on Rails) - Entry Level',
        companyName: 'Sun Asterisk Vietnam',
        companyLogoUrl: '',
        city: 'Hà Nội',
        location: 'Hà Nội',
        salaryText: '10 - 15 triệu',
        experienceText: 'Entry-level, dưới 1 năm',
        workingMode: 'On-site',
        skills: ['Ruby', 'Rails', 'PostgreSQL', 'Redis', 'Docker'],
        description: 'Phát triển web app Ruby on Rails cho các dự án Nhật Bản.',
        requirements: 'Entry-level backend developer. Có kiến thức OOP, biết SQL, Git.',
        responsibilities: 'Implement tính năng theo spec tiếng Nhật, fix bug, viết test Rspec.',
        benefits: 'Học tiếng Nhật miễn phí, visa support, team bonding thường xuyên.',
        applyUrl: 'https://topdev.vn/detail-jobs/backend-ruby-sun-asterisk',
        jobUrl: 'https://topdev.vn/detail-jobs/backend-ruby-sun-asterisk',
        isTargetJob: true,
        score: 55,
        contentHash: 'seed_hash_007',
    },
    {
        sourceCode: 'itviec',
        title: 'Backend Intern - Golang tại Startup Fintech',
        companyName: 'MoMo (M_Service)',
        companyLogoUrl: '',
        city: 'Hà Nội',
        location: 'Hà Nội',
        salaryText: '8 - 12 triệu',
        experienceText: 'Thực tập sinh',
        workingMode: 'Hybrid',
        skills: ['Go', 'Kafka', 'gRPC', 'MySQL'],
        description: 'Tham gia xây dựng hệ thống thanh toán real-time với hàng triệu transaction mỗi ngày.',
        requirements: 'Sinh viên CNTT năm 3-4, biết Go hoặc Java. Có thể làm part-time 3 ngày/tuần.',
        responsibilities: 'Phát triển microservice, xử lý message queue, performance testing.',
        benefits: 'Phụ cấp tốt, ăn trưa miễn phí, cơ hội tham gia tech talk nội bộ.',
        applyUrl: 'https://itviec.com/it-jobs/backend-intern-golang-momo',
        jobUrl: 'https://itviec.com/it-jobs/backend-intern-golang-momo',
        isTargetJob: true,
        score: 95,
        contentHash: 'seed_hash_008',
    },
];

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const { Job } = require('./src/modules/job-market/job.model');

    let inserted = 0;
    let skipped = 0;
    for (const job of jobSeed) {
        try {
            await Job.findOneAndUpdate(
                { contentHash: job.contentHash },
                { $setOnInsert: job },
                { upsert: true, new: true }
            );
            inserted++;
        } catch (err) {
            if (err.code === 11000) skipped++;
            else console.error('Error inserting job:', err.message);
        }
    }

    console.log(`Seeded: ${inserted} inserted, ${skipped} skipped`);
    const total = await Job.countDocuments();
    console.log(`Total jobs in DB: ${total}`);
    await mongoose.disconnect();
}

seed().catch(e => { console.error(e.message); process.exit(1); });
