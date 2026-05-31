'use strict';

const JOB_ROLES = [
    {
        code: 'frontend',
        label: 'Frontend',
        queries: {
            topdev: ['frontend intern', 'frontend fresher', 'react intern', 'thực tập frontend'],
            topcv: ['frontend intern', 'frontend fresher', 'react intern', 'thực tập frontend'],
            itviec: ['frontend intern', 'frontend fresher', 'react intern'],
            joboko: ['frontend intern', 'frontend fresher', 'thực tập frontend'],
        },
    },
    {
        code: 'backend',
        label: 'Backend',
        queries: {
            topdev: ['backend intern', 'backend fresher', 'nodejs intern', 'thực tập backend'],
            topcv: ['backend intern', 'backend fresher', 'nodejs intern', 'thực tập backend'],
            itviec: ['backend intern', 'backend fresher', 'nodejs intern'],
            joboko: ['backend intern', 'backend fresher', 'thực tập backend'],
        },
    },
    {
        code: 'fullstack',
        label: 'Fullstack',
        queries: {
            topdev: ['fullstack intern', 'fullstack fresher', 'thực tập fullstack'],
            topcv: ['fullstack intern', 'fullstack fresher', 'thực tập fullstack'],
            itviec: ['fullstack intern', 'fullstack fresher'],
            joboko: ['fullstack intern', 'fullstack fresher', 'thực tập fullstack'],
        },
    },
    {
        code: 'devops',
        label: 'DevOps',
        queries: {
            topdev: ['devops intern', 'devops fresher', 'cloud intern', 'system admin intern'],
            topcv: ['devops intern', 'devops fresher', 'cloud intern', 'thực tập devops'],
            itviec: ['devops intern', 'devops fresher', 'cloud intern'],
            joboko: ['devops intern', 'devops fresher', 'thực tập devops', 'thực tập cloud'],
        },
    },
    {
        code: 'mobile',
        label: 'Mobile',
        queries: {
            topdev: ['mobile intern', 'android intern', 'ios intern', 'flutter intern', 'react native intern'],
            topcv: ['mobile intern', 'android intern', 'ios intern', 'flutter fresher', 'thực tập mobile'],
            itviec: ['mobile intern', 'android intern', 'ios intern', 'flutter intern'],
            joboko: ['mobile intern', 'android intern', 'ios intern', 'thực tập mobile'],
        },
    },
    {
        code: 'ai',
        label: 'AI',
        queries: {
            topdev: ['ai intern', 'machine learning intern', 'deep learning intern', 'llm intern', 'ai agent intern'],
            topcv: ['ai intern', 'machine learning intern', 'deep learning fresher', 'llm intern', 'thực tập ai'],
            itviec: ['ai intern', 'machine learning intern', 'deep learning intern', 'llm intern'],
            joboko: ['ai intern', 'machine learning intern', 'deep learning intern', 'thực tập ai'],
        },
    },
    {
        code: 'cyber-security',
        label: 'Cyber Security',
        queries: {
            topdev: ['cyber security intern', 'security intern', 'pentest intern', 'thực tập an toàn thông tin'],
            topcv: ['cyber security intern', 'security intern', 'pentest intern', 'thực tập an toàn thông tin'],
            itviec: ['security intern', 'cyber security intern', 'pentest intern'],
            joboko: ['cyber security intern', 'security intern', 'thực tập an toàn thông tin'],
        },
    },
    {
        code: 'game',
        label: 'Game',
        queries: {
            topdev: ['game intern', 'unity intern', 'game developer fresher', 'thực tập game'],
            topcv: ['game intern', 'unity intern', 'game fresher', 'thực tập game'],
            itviec: ['game intern', 'unity intern', 'game fresher'],
            joboko: ['game intern', 'unity intern', 'thực tập game'],
        },
    },
    {
        code: 'qa',
        label: 'Tester',
        queries: {
            topdev: ['qa intern', 'tester intern', 'qa fresher', 'thực tập tester'],
            topcv: ['qa intern', 'tester intern', 'qa fresher', 'thực tập tester'],
            itviec: ['tester intern', 'qa intern', 'qa fresher'],
            joboko: ['qa intern', 'tester intern', 'thực tập tester'],
        },
    },
    {
        code: 'data',
        label: 'Data',
        queries: {
            topdev: ['data analyst intern', 'data engineer intern', 'data science intern'],
            topcv: ['data analyst intern', 'data engineer intern', 'data science intern', 'thực tập data'],
            itviec: ['data analyst intern', 'data engineer intern', 'data science intern'],
            joboko: ['data analyst intern', 'data engineer intern', 'thực tập data'],
        },
    },
    {
        code: 'network',
        label: 'Network',
        queries: {
            topdev: ['network intern', 'network engineer fresher', 'system admin intern'],
            topcv: ['network intern', 'network engineer fresher', 'thực tập quản trị mạng'],
            itviec: ['network intern', 'network engineer fresher'],
            joboko: ['network intern', 'network engineer fresher', 'thực tập quản trị mạng'],
        },
    },
];

const SOURCE_META = {
    itviec: { name: 'ITviec', url: 'https://itviec.com' },
    joboko: { name: 'JobOKO', url: 'https://vn.joboko.com' },
    topdev: { name: 'TopDev', url: 'https://topdev.vn' },
    topcv: { name: 'TopCV', url: 'https://www.topcv.vn' },
};

function getRole(code) {
    const normalizedCode = code === 'machine-learning' ? 'ai' : code;
    return JOB_ROLES.find((role) => role.code === normalizedCode);
}

function getRoles(roleCode) {
    if (!roleCode) return JOB_ROLES;
    const role = getRole(roleCode);
    return role ? [role] : [];
}

function getSourceMeta(sourceCode) {
    return SOURCE_META[sourceCode] || { name: sourceCode, url: '' };
}

module.exports = { JOB_ROLES, SOURCE_META, getRole, getRoles, getSourceMeta };
