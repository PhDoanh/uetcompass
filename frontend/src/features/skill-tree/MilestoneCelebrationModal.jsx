import React, { useMemo } from 'react';
import { Trophy, X } from 'lucide-react';

export default function MilestoneCelebrationModal({ open, milestone, roadmapTitle, onClose }) {
  const sparks = useMemo(
    () => [
      { x: '12%', y: '22%', dx: '-48px', dy: '-36px', delay: '0ms', color: '#60a5fa' },
      { x: '22%', y: '18%', dx: '-36px', dy: '-52px', delay: '60ms', color: '#38bdf8' },
      { x: '30%', y: '26%', dx: '-22px', dy: '-38px', delay: '120ms', color: '#f59e0b' },
      { x: '70%', y: '18%', dx: '32px', dy: '-46px', delay: '40ms', color: '#fb7185' },
      { x: '80%', y: '24%', dx: '48px', dy: '-30px', delay: '90ms', color: '#a78bfa' },
      { x: '86%', y: '32%', dx: '36px', dy: '-6px', delay: '140ms', color: '#22c55e' },
      { x: '18%', y: '72%', dx: '-44px', dy: '26px', delay: '110ms', color: '#f97316' },
      { x: '28%', y: '78%', dx: '-24px', dy: '38px', delay: '160ms', color: '#38bdf8' },
      { x: '72%', y: '78%', dx: '30px', dy: '36px', delay: '130ms', color: '#60a5fa' },
      { x: '82%', y: '70%', dx: '44px', dy: '22px', delay: '190ms', color: '#f59e0b' },
      { x: '46%', y: '12%', dx: '0px', dy: '-58px', delay: '80ms', color: '#eab308' },
      { x: '54%', y: '86%', dx: '0px', dy: '52px', delay: '170ms', color: '#22c55e' },
    ],
    []
  );

  if (!open || !milestone) {
    return null;
  }

  const percent = milestone.percent ?? 0;
  const title = milestone.title || 'Milestone';

  return (
    <div className="milestone-celebration" role="dialog" aria-modal="true" aria-label="Milestone achieved">
      <div className="milestone-celebration__card" onClick={(event) => event.stopPropagation()}>
        <div className="milestone-fireworks" aria-hidden="true">
          {sparks.map((spark, index) => (
            <span
              key={`spark-${index}`}
              className="milestone-firework"
              style={{
                '--spark-x': spark.x,
                '--spark-y': spark.y,
                '--spark-dx': spark.dx,
                '--spark-dy': spark.dy,
                '--spark-delay': spark.delay,
                '--spark-color': spark.color,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          className="milestone-celebration__close"
          onClick={onClose}
          aria-label="Close celebration"
        >
          <X size={18} />
        </button>

        <div className="milestone-celebration__icon">
          <Trophy size={28} />
        </div>
        <h3 className="milestone-celebration__title">{title}!</h3>
        <p className="milestone-celebration__subtitle">
          Bạn đã đạt mốc {percent}% của {roadmapTitle || 'roadmap cá nhân'}.
        </p>
        <p className="milestone-celebration__note">
          Tiếp tục giữ nhịp nhé!
        </p>
      </div>
      <button
        type="button"
        className="milestone-celebration__backdrop"
        onClick={onClose}
        aria-label="Close celebration overlay"
      />
    </div>
  );
}
