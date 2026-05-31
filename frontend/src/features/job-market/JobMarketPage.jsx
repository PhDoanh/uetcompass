/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Banknote,
    Briefcase,
    Building2,
    CalendarDays,
    ChevronRight,
    Clock3,
    ExternalLink,
    Globe2,
    Info,
    Layers3,
    Loader2,
    MapPin,
    RefreshCw,
    Search,
    X,
} from 'lucide-react';
import jobApi from '../../services/job.api';
import { useAuth } from '../../providers/AuthProvider';
import './job-market.css';

const SOURCE_LABELS = {
    topdev: 'TopDev',
    itviec: 'ITviec',
    topcv: 'TopCV',
    joboko: 'JobOKO',
};

const SOURCE_URLS = {
    topdev: 'https://topdev.vn',
    itviec: 'https://itviec.com',
    topcv: 'https://www.topcv.vn',
    joboko: 'https://vn.joboko.com',
};

const FALLBACK_ROLES = [
    { code: 'frontend', label: 'Frontend' },
    { code: 'backend', label: 'Backend' },
    { code: 'fullstack', label: 'Fullstack' },
    { code: 'devops', label: 'DevOps' },
    { code: 'mobile', label: 'Mobile' },
    { code: 'ai', label: 'AI' },
    { code: 'cyber-security', label: 'Cyber Security' },
    { code: 'game', label: 'Game' },
    { code: 'qa', label: 'Tester' },
    { code: 'data', label: 'Data' },
    { code: 'network', label: 'Network' },
];

function getSourceLabel(job) {
    return job.sourceName || SOURCE_LABELS[job.sourceCode] || job.sourceCode || 'Nguồn tuyển dụng';
}

function getSourceUrl(job) {
    return job.sourceUrl || SOURCE_URLS[job.sourceCode] || job.jobUrl;
}

function getSourceHost(job) {
    try {
        return new URL(getSourceUrl(job)).hostname.replace(/^www\./, '');
    } catch {
        return getSourceLabel(job);
    }
}

function findFact(values = [], pattern) {
    return values.find((value) => pattern.test(String(value || '')));
}

function getJobFacts(job) {
    const skills = Array.isArray(job.skills) ? job.skills.filter(Boolean) : [];
    const salary = job.salaryText || findFact(skills, /trieu|triệu|usd|vnd|\$|thoa|thoả|luong|lương/i);
    const experience = job.experienceText || findFact(skills, /kinh nghiem|kinh nghiệm|nam|năm/i);
    const posted = job.postedAt
        ? new Date(job.postedAt).toLocaleDateString('vi-VN')
        : findFact(skills, /dang|đăng|ngay truoc|ngày trước|tuan truoc|tuần trước/i);
    const location = job.location || job.city;

    return {
        experience: experience || 'Không yêu cầu',
        location: location || 'Đang cập nhật',
        posted: posted || 'Đang cập nhật',
        salary: salary || 'Thỏa thuận',
        workingMode: job.workingMode || 'Theo tin tuyển dụng',
    };
}

function getDisplaySkills(job) {
    const facts = getJobFacts(job);
    const blocked = new Set(Object.values(facts).filter(Boolean));
    const skills = Array.isArray(job.skills) ? job.skills : [];

    return skills
        .map((skill) => String(skill || '').trim())
        .filter(Boolean)
        .filter((skill) => !blocked.has(skill))
        .filter((skill) => !/dang|đăng|ngay truoc|ngày trước|tuan truoc|tuần trước/i.test(skill))
        .filter((skill) => !/trieu|triệu|usd|vnd|\$|thoa|thoả|luong|lương/i.test(skill))
        .slice(0, 12);
}

function CompanyLogo({ job, size = 'card' }) {
    const [failed, setFailed] = useState(false);
    const className = size === 'detail' ? 'jm-detail__logo' : 'jm-card__logo';
    const fallbackClassName = size === 'detail' ? 'jm-detail__logo-fallback' : 'jm-card__logo-fallback';

    if (job.companyLogoUrl && !failed) {
        return (
            <img
                src={job.companyLogoUrl}
                alt={job.companyName || 'Company logo'}
                className={className}
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <div className={fallbackClassName}>
            <Building2 size={size === 'detail' ? 28 : 20} />
        </div>
    );
}

function JobCard({ job, isSelected, onClick }) {
    return (
        <button
            type="button"
            className={`jm-card${isSelected ? ' jm-card--selected' : ''}`}
            onClick={onClick}
        >
            <div className="jm-card__header">
                <CompanyLogo job={job} />
                <div className="jm-card__meta">
                    <span className="jm-card__source">
                        <Globe2 size={11} />
                        {getSourceLabel(job)}
                    </span>
                    {job.roleLabel && <span className="jm-card__role">{job.roleLabel}</span>}
                </div>
            </div>
            <h3 className="jm-card__title">{job.title}</h3>
            <p className="jm-card__company">{job.companyName || 'Đang cập nhật công ty'}</p>
            {job.targetAudienceLabel && (
                <p className="jm-card__audience">{job.targetAudienceLabel}</p>
            )}
            <div className="jm-card__facts">
                {job.city && (
                    <span className="jm-card__location">
                        <MapPin size={12} />
                        {job.city}
                    </span>
                )}
                {job.salaryText && <span className="jm-card__salary">{job.salaryText}</span>}
            </div>
            {job.skills?.length > 0 && (
                <div className="jm-card__skills">
                    {job.skills.slice(0, 4).map((s, i) => (
                        <span key={i} className="jm-card__skill-tag">{s}</span>
                    ))}
                    {job.skills.length > 4 && (
                        <span className="jm-card__skill-tag jm-card__skill-tag--more">+{job.skills.length - 4}</span>
                    )}
                </div>
            )}
            <ChevronRight size={14} className="jm-card__arrow" />
        </button>
    );
}

function JobDetail({ job }) {
    if (!job) {
        return (
            <div className="jm-detail jm-detail--empty">
                <Briefcase size={48} className="jm-detail__empty-icon" />
                <p>Chọn một công việc để xem chi tiết</p>
            </div>
        );
    }

    const facts = getJobFacts(job);
    const displaySkills = getDisplaySkills(job);
    const overview = [
        { label: 'Phu hop', value: job.targetAudienceLabel || 'Intern / Fresher', icon: Info },
        { label: 'Mức lương', value: facts.salary, icon: Banknote, tone: 'salary' },
        { label: 'Kinh nghiệm', value: facts.experience, icon: Clock3 },
        { label: 'Địa điểm', value: facts.location, icon: MapPin },
        { label: 'Hình thức', value: facts.workingMode, icon: Briefcase },
        { label: 'Đăng tuyển', value: facts.posted, icon: CalendarDays },
        { label: 'Nhóm việc', value: job.roleLabel || 'Đang cập nhật', icon: Layers3, tone: 'role' },
    ];

    function Section({ title, content, fallback }) {
        const body = content || fallback;
        if (!body) return null;
        return (
            <div className="jm-detail__section">
                <h3 className="jm-detail__section-title">{title}</h3>
                <p className={`jm-detail__section-body${content ? '' : ' jm-detail__section-body--muted'}`}>{body}</p>
            </div>
        );
    }

    return (
        <div className="jm-detail">
            <div className="jm-detail__layout">
                <main className="jm-detail__main">
                    <section className="jm-detail__hero">
                        <div className="jm-detail__company-row">
                            <CompanyLogo job={job} size="detail" />
                            <div className="jm-detail__heading">
                                <div className="jm-detail__source-line">
                                    <span>{getSourceLabel(job)}</span>
                                    <span>{getSourceHost(job)}</span>
                                </div>
                                <h2 className="jm-detail__title">{job.title}</h2>
                                <p className="jm-detail__company">{job.companyName || 'Đang cập nhật công ty'}</p>
                            </div>
                        </div>

                        <div className="jm-detail__chips">
                            {job.roleLabel && (
                                <span className="jm-detail__chip jm-detail__chip--role">
                                    <Layers3 size={12} /> {job.roleLabel}
                                </span>
                            )}
                            <span className="jm-detail__chip">
                                <MapPin size={12} /> {facts.location}
                            </span>
                            <span className="jm-detail__chip jm-detail__chip--salary">
                                <Banknote size={12} /> {facts.salary}
                            </span>
                            <a
                                className="jm-detail__chip jm-detail__chip--source"
                                href={getSourceUrl(job)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Globe2 size={12} /> {getSourceLabel(job)}
                            </a>
                        </div>
                    </section>

                    <section className="jm-detail__section jm-detail__section--overview">
                        <h3 className="jm-detail__section-title">Thông tin việc làm</h3>
                        <div className="jm-detail__overview-grid">
                            {overview.map(({ label, value, icon: Icon, tone }) => (
                                <div key={label} className={`jm-detail__overview-item${tone ? ` jm-detail__overview-item--${tone}` : ''}`}>
                                    <span className="jm-detail__overview-icon"><Icon size={16} /></span>
                                    <span className="jm-detail__overview-label">{label}</span>
                                    <strong className="jm-detail__overview-value">{value}</strong>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="jm-detail__section">
                        <div className="jm-detail__section-heading">
                            <h3 className="jm-detail__section-title">Kỹ năng và từ khóa</h3>
                            <span>{displaySkills.length || 0}</span>
                        </div>
                        <div className="jm-detail__skills">
                            {(displaySkills.length > 0 ? displaySkills : [job.roleLabel, getSourceLabel(job), facts.location].filter(Boolean)).map((skill, i) => (
                                <span key={`${skill}-${i}`} className="jm-card__skill-tag">{skill}</span>
                            ))}
                        </div>
                    </section>

                    <Section
                        title="Mô tả công việc"
                        content={job.description || job.responsibilities}
                        fallback="Thông tin mô tả chi tiết chưa được website tuyển dụng công khai trong dữ liệu crawl. Bạn có thể mở tin gốc để xem đầy đủ nội dung."
                    />
                    <Section
                        title="Yêu cầu ứng viên"
                        content={job.requirements}
                        fallback={`${job.roleLabel || 'Vị trí này'} đang được phân loại theo nhóm ${job.roleLabel || 'việc làm'} với kinh nghiệm: ${facts.experience}.`}
                    />
                    <Section
                        title="Quyền lợi"
                        content={job.benefits}
                        fallback={`Mức lương/phúc lợi: ${facts.salary}. Chi tiết chính thức nằm trên tin tuyển dụng gốc.`}
                    />
                </main>

                <aside className="jm-detail__sidebar">
                    <div className="jm-detail__apply-card">
                        <a
                            href={job.applyUrl || job.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="jm-detail__apply-btn"
                        >
                            Ứng tuyển ngay <ExternalLink size={15} />
                        </a>
                        <a
                            href={job.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="jm-detail__secondary-link"
                        >
                            Xem tin gốc <ExternalLink size={13} />
                        </a>
                    </div>

                    <div className="jm-detail__side-card">
                        <h3 className="jm-detail__side-title">Tóm tắt</h3>
                        <div className="jm-detail__side-list">
                            <div>
                                <Banknote size={15} />
                                <span>{facts.salary}</span>
                            </div>
                            <div>
                                <Clock3 size={15} />
                                <span>{facts.experience}</span>
                            </div>
                            <div>
                                <MapPin size={15} />
                                <span>{facts.location}</span>
                            </div>
                            <div>
                                <CalendarDays size={15} />
                                <span>{facts.posted}</span>
                            </div>
                        </div>
                    </div>

                    <div className="jm-detail__side-card">
                        <h3 className="jm-detail__side-title">Công ty</h3>
                        <div className="jm-detail__company-mini">
                            <CompanyLogo job={job} size="detail" />
                            <div>
                                <strong>{job.companyName || 'Đang cập nhật công ty'}</strong>
                                <span>{facts.location}</span>
                            </div>
                        </div>
                        {job.companyAddress && <p className="jm-detail__side-note">{job.companyAddress}</p>}
                    </div>

                    <div className="jm-detail__side-card">
                        <h3 className="jm-detail__side-title">Nguồn tuyển dụng</h3>
                        <a
                            className="jm-detail__source-card-link"
                            href={getSourceUrl(job)}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Globe2 size={16} />
                            <span>{getSourceLabel(job)}</span>
                            <ExternalLink size={13} />
                        </a>
                        <p className="jm-detail__side-note">{getSourceHost(job)}</p>
                    </div>

                    {job.companyInfo && (
                        <div className="jm-detail__side-card">
                            <h3 className="jm-detail__side-title">Về công ty</h3>
                            <p className="jm-detail__side-note">{job.companyInfo}</p>
                        </div>
                    )}

                    <div className="jm-detail__side-card jm-detail__side-card--muted">
                        <Info size={16} />
                        <p>Dữ liệu được tổng hợp từ tin tuyển dụng gốc và có thể thay đổi theo trang đăng tuyển.</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default function JobMarketPage() {
    const { isAuthenticated, accessToken } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [roles, setRoles] = useState(FALLBACK_ROLES);
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedJob, setSelectedJob] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [crawling, setCrawling] = useState(false);
    const [crawlStatus, setCrawlStatus] = useState(null);
    const [q, setQ] = useState('');
    const [inputQ, setInputQ] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');
    const listRef = useRef(null);

    const LIMIT = 20;

    const fetchJobs = useCallback(async (nextPage = 1, query = q, role = selectedRole, replace = true) => {
        if (nextPage === 1) setLoading(true);
        else setLoadingMore(true);
        setError('');
        try {
            const result = await jobApi.listJobs({
                page: nextPage,
                limit: LIMIT,
                q: query,
                role: role === 'all' ? undefined : role,
                all: false,
            });
            setTotal(result.pagination?.total || 0);
            if (replace) {
                const items = result.items || [];
                setJobs(items);
                setSelectedJob(items[0] || null);
                listRef.current?.scrollTo({ top: 0 });
            } else {
                setJobs((prev) => [...prev, ...(result.items || [])]);
            }
            setPage(nextPage);
        } catch {
            setError('Không thể tải danh sách việc làm. Vui lòng thử lại.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [q, selectedRole]);

    useEffect(() => {
        fetchJobs(1, '', 'all', true);
        loadCrawlStatus();
        loadRoles();
    }, []);

    async function loadRoles() {
        try {
            const result = await jobApi.listRoles();
            if (Array.isArray(result.roles) && result.roles.length > 0) {
                setRoles(result.roles);
            }
        } catch {
            setRoles(FALLBACK_ROLES);
        }
    }

    async function loadCrawlStatus() {
        try {
            const status = await jobApi.getCrawlStatus();
            setCrawlStatus(status);
        } catch {
            // Status is best effort.
        }
    }

    async function handleSearch(e) {
        e.preventDefault();
        setQ(inputQ);
        fetchJobs(1, inputQ, selectedRole, true);
    }

    function handleRoleChange(roleCode) {
        setSelectedRole(roleCode);
        fetchJobs(1, q, roleCode, true);
    }

    async function handleTriggerCrawl() {
        if (!isAuthenticated) return;
        setCrawling(true);
        setError('');
        try {
            await jobApi.triggerCrawl(accessToken, {
                role: selectedRole === 'all' ? undefined : selectedRole,
                limitPerSource: 40,
            });
            await loadCrawlStatus();
            setTimeout(() => fetchJobs(1, q, selectedRole, true), 3000);
        } catch (err) {
            setError(err.message || 'Không thể khởi động crawl.');
        } finally {
            setCrawling(false);
        }
    }

    function handleLoadMore() {
        fetchJobs(page + 1, q, selectedRole, false);
    }

    const hasMore = jobs.length < total;

    return (
        <div className="jm-page">
            <div className="jm-toolbar">
                <div className="jm-toolbar__left">
                    <Briefcase size={18} />
                    <h1 className="jm-toolbar__title">Thị trường tuyển dụng</h1>
                    <span className="jm-toolbar__count">{total > 0 ? `${total} việc làm` : ''}</span>
                </div>
                <div className="jm-toolbar__right">
                    <form className="jm-search" onSubmit={handleSearch}>
                        <input
                            type="text"
                            className="jm-search__input"
                            placeholder="Tìm kiếm vị trí..."
                            value={inputQ}
                            onChange={(e) => setInputQ(e.target.value)}
                        />
                        {inputQ && (
                            <button
                                type="button"
                                className="jm-search__clear"
                                onClick={() => {
                                    setInputQ('');
                                    setQ('');
                                    fetchJobs(1, '', selectedRole, true);
                                }}
                                aria-label="Xóa tìm kiếm"
                            >
                                <X size={14} />
                            </button>
                        )}
                        <button type="submit" className="jm-search__btn" aria-label="Tìm kiếm">
                            <Search size={14} />
                        </button>
                    </form>
                    {isAuthenticated && (
                        <button
                            type="button"
                            className="jm-crawl-btn"
                            onClick={handleTriggerCrawl}
                            disabled={crawling || crawlStatus?.isRunning}
                            title="Cập nhật danh sách việc làm"
                        >
                            <RefreshCw size={14} className={crawling || crawlStatus?.isRunning ? 'jm-crawl-btn--spinning' : ''} />
                            {crawling || crawlStatus?.isRunning ? 'Đang crawl...' : 'Cập nhật'}
                        </button>
                    )}
                </div>
            </div>

            <div className="jm-rolebar">
                <button
                    type="button"
                    className={`jm-rolebar__item${selectedRole === 'all' ? ' jm-rolebar__item--active' : ''}`}
                    onClick={() => handleRoleChange('all')}
                >
                    Tất cả
                </button>
                {roles.map((role) => (
                    <button
                        type="button"
                        key={role.code}
                        className={`jm-rolebar__item${selectedRole === role.code ? ' jm-rolebar__item--active' : ''}`}
                        onClick={() => handleRoleChange(role.code)}
                    >
                        {role.label}
                    </button>
                ))}
            </div>

            {error && <div className="jm-error">{error}</div>}

            <div className="jm-split">
                <div className="jm-list" ref={listRef}>
                    {loading ? (
                        <div className="jm-loading">
                            <Loader2 size={24} className="jm-loading__icon" />
                            <span>Đang tải việc làm...</span>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="jm-empty">
                            <Briefcase size={40} />
                            <p>Chưa có việc làm nào cho bộ lọc này. Bấm Cập nhật để crawl dữ liệu.</p>
                        </div>
                    ) : (
                        <>
                            {jobs.map((job) => (
                                <JobCard
                                    key={job._id}
                                    job={job}
                                    isSelected={selectedJob?._id === job._id}
                                    onClick={() => setSelectedJob(job)}
                                />
                            ))}
                            {hasMore && (
                                <button
                                    type="button"
                                    className="jm-load-more"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? <Loader2 size={14} className="jm-loading__icon" /> : null}
                                    {loadingMore ? 'Đang tải...' : `Xem thêm (${total - jobs.length} việc làm)`}
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className="jm-detail-panel">
                    <JobDetail job={selectedJob} />
                </div>
            </div>
        </div>
    );
}
