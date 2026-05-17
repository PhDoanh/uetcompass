import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, GraduationCap, Gauge, Map, Route, Sparkles, Users } from 'lucide-react';

const FEATURES = [
  {
    id: 'f1',
    title: 'Lộ trình cá nhân hóa',
    desc: 'AI phân tích hồ sơ và đề xuất lộ trình học tập phù hợp nhất cho bạn.',
    angle: -80,
    x: -550,
    y: -95,
    icon: Route,
  },
  {
    id: 'f2',
    title: 'Skill Tree trực quan',
    desc: 'Bản đồ kỹ năng tương tác, theo dõi tiến trình học tập từng bước.',
    angle: -50,
    x: -260,
    y: -170,
    icon: Map,
  },
  {
    id: 'f3',
    title: 'Tài nguyên học tập',
    desc: 'Tích hợp tài liệu, slide bài giảng và đề thi từ kho tư liệu UET-VNU.',
    angle: -110,
    x: -420,
    y: 100,
    icon: BookOpen,
  },
  {
    id: 'f4',
    title: 'Roadmap cộng đồng',
    desc: 'Hàng nghìn lộ trình được kiểm duyệt bởi sinh viên và chuyên gia UET.',
    angle: 80,
    x: 350,
    y: -45,
    icon: Users,
  },
  {
    id: 'f5',
    title: 'Theo dõi tiến trình',
    desc: 'Dashboard trực quan giúp bạn nắm rõ tốc độ và hướng phát triển.',
    angle: 110,
    x: 550,
    y: 140,
    icon: Gauge,
  },
  {
    id: 'f6',
    title: 'Cố vấn định hướng',
    desc: 'Nhận phản hồi từ mentor UET và tối ưu hành trình học tập của bạn.',
    angle: 135,
    x: 240,
    y: 200,
    icon: GraduationCap,
  },
];

const FEATURE_ANGLE_MAP = Object.fromEntries(FEATURES.map((feature) => [feature.id, feature.angle]));

const IDLE_SPIN_SPEED = 8; // deg per second
const NEEDLE_EASE = 8; // smoothing factor

const STARS = [
  { id: 's1', top: '-3%', left: '-50%', size: '70px', rotate: '0deg' },
  { id: 's2', top: '12%', right: '12%', size: '40px', rotate: '15deg' },
  { id: 's3', top: '38%', left: '5%', size: '48px', rotate: '-10deg' },
  { id: 's4', bottom: '20%', left: '16%', size: '40px', rotate: '25deg' },
  { id: 's5', bottom: '-5%', right: '-30%', size: '54px', rotate: '0deg' },
  { id: 's6', top: '28%', right: '-45%', size: '30px', rotate: '-10deg' },
];

function polarToXY(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

export default function CompassFeatureMap() {
  const [activeFeature, setActiveFeature] = useState(null);
  const containerRef = useRef(null);
  const compassRef = useRef(null);
  const activeFeatureRef = useRef(null);
  const needleAngleRef = useRef(0);
  const isIdle = activeFeature == null;

  useEffect(() => {
    activeFeatureRef.current = activeFeature;
  }, [activeFeature]);

  useEffect(() => {
    let rafId;
    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let angle = needleAngleRef.current;
      const activeId = activeFeatureRef.current;

      if (!activeId) {
        angle += IDLE_SPIN_SPEED * dt;
      } else {
        const target = FEATURE_ANGLE_MAP[activeId] ?? angle;
        const current = ((angle % 360) + 360) % 360;
        const delta = ((target - current + 540) % 360) - 180;
        angle += delta * Math.min(1, NEEDLE_EASE * dt);
      }

      needleAngleRef.current = angle;

      if (compassRef.current) {
        compassRef.current.style.setProperty('--needle-angle', `${angle}deg`);
        compassRef.current.style.setProperty('--aura-angle', `${angle}deg`);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="cfm" role="region" aria-label="Tính năng nổi bật">
      <div className="cfm__stars" aria-hidden="true">
        {STARS.map((star) => (
          <Sparkles
            key={star.id}
            className="cfm__star"
            aria-hidden="true"
            style={{
              '--star-top': star.top,
              '--star-right': star.right,
              '--star-bottom': star.bottom,
              '--star-left': star.left,
              '--star-size': star.size,
              '--star-rotate': star.rotate,
            }}
          />
        ))}
      </div>
      {/* Central compass */}
      <div
        className={`cfm__compass-wrap${isIdle ? ' cfm__compass-wrap--idle' : ''}`}
        aria-hidden="true"
        ref={compassRef}
      >
        <svg
          className="cfm__compass-svg"
          viewBox="0 0 200 200"
          width="200"
          height="200"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="cfm-surface" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="var(--surface-1)" stopOpacity="0.85" />
              <stop offset="70%" stopColor="var(--surface-2)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--surface-0)" stopOpacity="0.4" />
            </radialGradient>
            <radialGradient id="cfm-surface-inner" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="var(--surface-2)" stopOpacity="0.75" />
              <stop offset="100%" stopColor="var(--surface-0)" stopOpacity="0.5" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="92" className="cfm__surface cfm__surface--outer" />
          <circle cx="100" cy="100" r="70" className="cfm__surface cfm__surface--inner" />
          <g className="cfm__needle-rotor">
            <g className="cfm__needle-g">
              <polygon points="100,14 86,98 100,122 114,98" className="cfm__needle cfm__needle--north" />
              <polygon points="100,186 86,98 100,122 114,98" className="cfm__needle cfm__needle--south" />
              <circle cx="100" cy="100" r="6" className="cfm__pivot" />
            </g>
          </g>
          <circle cx="100" cy="100" r="92" className="cfm__glass cfm__glass--outer" />
          <circle cx="100" cy="100" r="70" className="cfm__glass cfm__glass--inner" />
          {/* Outer ring */}
          <circle cx="100" cy="100" r="94" className="cfm__ring cfm__ring--outer" />
          <circle cx="100" cy="100" r="72" className="cfm__ring cfm__ring--inner" />
          {/* Cardinal marks */}
          {['N','E','S','W'].map((dir, i) => {
            const pos = polarToXY(i * 90, 82);
            return (
              <text
                key={dir}
                x={100 + pos.x}
                y={100 + pos.y + 4}
                textAnchor="middle"
                className="cfm__cardinal"
              >
                {dir}
              </text>
            );
          })}
          {/* Tick marks */}
          {Array.from({ length: 32 }).map((_, i) => {
            const a = (i * 360) / 32;
            const inner = i % 4 === 0 ? 76 : 80;
            const p1 = polarToXY(a, inner);
            const p2 = polarToXY(a, 88);
            return (
              <line
                key={i}
                x1={100 + p1.x} y1={100 + p1.y}
                x2={100 + p2.x} y2={100 + p2.y}
                className="cfm__tick"
              />
            );
          })}
        </svg>
        <div className="cfm__aura" aria-hidden="true" />
      </div>

      {/* Feature cards arranged in orbit */}
      <ul className="cfm__orbit" role="list" ref={containerRef}>
        {FEATURES.map((feature) => {
          const pos = { x: feature.x, y: feature.y };
          const isActive = activeFeature === feature.id;
          return (
            <li
              key={feature.id}
              className={`cfm__feature-card${isActive ? ' cfm__feature-card--active' : ''}`}
              style={{
                '--card-x': `${pos.x}px`,
                '--card-y': `${pos.y}px`,
              }}
            >
              <button
                type="button"
                className="cfm__feature-button"
                aria-pressed={isActive}
                onMouseEnter={() => setActiveFeature(feature.id)}
                onMouseLeave={() => setActiveFeature(null)}
                onFocus={() => setActiveFeature(feature.id)}
                onBlur={() => setActiveFeature(null)}
                onClick={() => setActiveFeature(isActive ? null : feature.id)}
              >
                <span className="cfm__feature-ico" aria-hidden="true">
                  <feature.icon size={16} />
                </span>
                <strong className="cfm__feature-title">{feature.title}</strong>
                <p className="cfm__feature-desc">{feature.desc}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
