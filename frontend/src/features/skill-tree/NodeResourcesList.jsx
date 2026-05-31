import React, { useMemo } from 'react';
import { Briefcase, ExternalLink, FileText, PlayCircle } from 'lucide-react';

function getResourceUrl(resource) {
  if (typeof resource === 'string') {
    return resource;
  }

  return resource?.url || resource?.link || resource?.applyUrl || resource?.jobUrl || '';
}

function getTypeLabel(type = '') {
  const labels = {
    video: 'Video',
    slide: 'Slide',
    lecture_note: 'Lecture note',
    textbook: 'Textbook',
    syllabus: 'Syllabus',
    docs: 'Docs',
    documentation: 'Docs',
    course: 'Course',
    project: 'Project',
    lab: 'Lab',
    exercise: 'Exercise',
    assignment: 'Assignment',
    job: 'Job',
    article: 'Article',
  };

  return labels[type] || 'Resource';
}

function normalizeResource(resource, index) {
  if (typeof resource === 'string') {
    const url = resource.trim();
    if (!url) return null;
    return {
      title: `Resource ${index + 1}`,
      url,
      type: 'article',
      isJob: false,
      meta: '',
      description: '',
      skills: [],
    };
  }

  if (!resource || typeof resource !== 'object') {
    return null;
  }

  const embeddedJob = resource.metadata?.job || null;
  const type = resource.type || resource.resourceType || (embeddedJob ? 'job' : 'article');
  const url = getResourceUrl(resource);
  if (!url) return null;

  const job = embeddedJob || (type === 'job' ? resource : null);
  const title = resource.title || resource.name || job?.title || `Resource ${index + 1}`;
  const metaParts = job
    ? [job.companyName, job.location, job.salaryText, job.experienceText, job.sourceName || job.sourceCode]
    : [
        getTypeLabel(type),
        resource.courseCode,
        resource.platform || resource.sourceName || resource.sourceType,
      ];

  return {
    title,
    url,
    type,
    isJob: type === 'job',
    meta: metaParts.filter(Boolean).join(' | '),
    description: resource.description || '',
    skills: Array.isArray(job?.skills) ? job.skills : [],
  };
}

function normalizeJob(job, index) {
  if (!job || typeof job !== 'object') {
    return null;
  }

  const url = job.applyUrl || job.jobUrl;
  if (!url) return null;

  return {
    title: job.title || `Job ${index + 1}`,
    url,
    type: 'job',
    isJob: true,
    meta: [job.companyName, job.location, job.salaryText, job.experienceText, job.sourceName || job.sourceCode]
      .filter(Boolean)
      .join(' | '),
    description: '',
    skills: Array.isArray(job.skills) ? job.skills : [],
  };
}

function dedupeItems(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!item) continue;
    const key = item.url || `${item.type}:${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function ResourceIcon({ type, isJob }) {
  if (isJob) {
    return <Briefcase size={16} aria-hidden="true" />;
  }

  if (type === 'video') {
    return <PlayCircle size={16} aria-hidden="true" />;
  }

  return <FileText size={16} aria-hidden="true" />;
}

function ResourceCard({ item }) {
  return (
    <li className={`resources-tab__item resources-tab__item--card ${item.isJob ? 'resources-tab__item--job' : ''}`}>
      <div className="resources-tab__item-icon">
        <ResourceIcon type={item.type} isJob={item.isJob} />
      </div>
      <div className="resources-tab__item-body">
        <div className="resources-tab__item-head">
          <a href={item.url} target="_blank" rel="noreferrer" className="resources-tab__title-link">
            {item.title}
          </a>
          <span className="resources-tab__type-chip">{getTypeLabel(item.type)}</span>
        </div>
        {item.meta ? <p className="resources-tab__description">{item.meta}</p> : null}
        {item.description && !item.isJob ? (
          <p className="resources-tab__snippet">{item.description}</p>
        ) : null}
        {item.skills.length > 0 ? (
          <div className="resources-tab__skill-row">
            {item.skills.slice(0, 5).map((skill) => (
              <span key={skill} className="resources-tab__skill-chip">{skill}</span>
            ))}
          </div>
        ) : null}
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="resources-tab__open-link"
        aria-label={`Open ${item.title}`}
      >
        <ExternalLink size={15} />
      </a>
    </li>
  );
}

export default function NodeResourcesList({ resources = [], relatedJobs = [] }) {
  const { learningResources, jobResources } = useMemo(() => {
    const normalizedResources = (Array.isArray(resources) ? resources : [])
      .map(normalizeResource)
      .filter(Boolean);
    const normalizedJobs = (Array.isArray(relatedJobs) ? relatedJobs : [])
      .map(normalizeJob)
      .filter(Boolean);
    const allJobs = dedupeItems([
      ...normalizedResources.filter((item) => item.isJob),
      ...normalizedJobs,
    ]);

    return {
      learningResources: dedupeItems(normalizedResources.filter((item) => !item.isJob)),
      jobResources: allJobs,
    };
  }, [resources, relatedJobs]);

  const isEmpty = learningResources.length === 0 && jobResources.length === 0;

  return (
    <section className="resources-tab__section">
      <h4 className="resources-tab__heading">Resources</h4>
      {isEmpty ? (
        <p className="skill-tree-muted-text">No resources available</p>
      ) : (
        <div className="resources-tab__groups">
          {learningResources.length > 0 ? (
            <ul className="resources-tab__list">
              {learningResources.map((item) => (
                <ResourceCard key={item.url} item={item} />
              ))}
            </ul>
          ) : null}

          {jobResources.length > 0 ? (
            <div className="resources-tab__job-group">
              <h5 className="resources-tab__subheading">Related jobs</h5>
              <ul className="resources-tab__list">
                {jobResources.map((item) => (
                  <ResourceCard key={item.url} item={item} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
