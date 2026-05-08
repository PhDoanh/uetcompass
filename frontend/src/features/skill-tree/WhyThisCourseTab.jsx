import React from 'react';

/**
 * T045: Why This Course tab - AI explanation with caching
 */

export default function WhyThisCourseTab({ reason }) {
  const content = String(reason || '').trim();

  return (
    <div className="why-tab">
      <p className="why-tab__content">
        {content || 'No explanation available for this node.'}
      </p>
    </div>
  );
}
