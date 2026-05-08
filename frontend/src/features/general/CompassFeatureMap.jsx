import React, { useRef, useState } from 'react';

const FEATURES = [
  {
    id: 'f1',
    title: 'Lộ trình cá nhân hóa',
    desc: 'AI phân tích hồ sơ và đề xuất lộ trình học tập phù hợp nhất cho bạn.',
    angle: 330,
  },
  {
    id: 'f2',
    title: 'Skill Tree trực quan',
    desc: 'Bản đồ kỹ năng tương tác, theo dõi tiến trình học tập từng bước.',
    angle: 40,
  },
  {
    id: 'f3',
    title: 'Roadmap cộng đồng',
    desc: 'Hàng nghìn lộ trình được kiểm duyệt bởi sinh viên và chuyên gia UET.',
    angle: 110,
  },
  {
    id: 'f4',
    title: 'Theo dõi tiến trình',
    desc: 'Dashboard trực quan giúp bạn nắm rõ tốc độ và hướng phát triển.',
    angle: 190,
  },
  {
    id: 'f5',
    title: 'Tài nguyên học tập',
    desc: 'Tích hợp tài liệu, slide bài giảng và đề thi từ kho tư liệu UET-VNU.',
    angle: 260,
  },
];

const COMPASS_R = 88; // orbit radius in px (from center of compass to card anchor)
const CARD_ORBIT = 220; // orbit radius for cards (container coordinates)

function polarToXY(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

export default function CompassFeatureMap() {
  const [activeFeature, setActiveFeature] = useState(null);
  const containerRef = useRef(null);

  const needleAngle = activeFeature != null
    ? FEATURES.find((f) => f.id === activeFeature)?.angle ?? 0
    : 0;

  return (
    <div className="cfm" role="region" aria-label="Tính năng nổi bật">
      {/* Central compass */}
      <div
        className="cfm__compass-wrap"
        aria-hidden="true"
        style={{ '--needle-angle': `${needleAngle}deg` }}
      >
        <svg
          className="cfm__compass-svg"
          viewBox="0 0 200 200"
          width="200"
          height="200"
          aria-hidden="true"
        >
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
          {/* Needle */}
          <g className="cfm__needle-g">
            <polygon points="100,20 96,100 100,112 104,100" className="cfm__needle cfm__needle--north" />
            <polygon points="100,180 96,100 100,112 104,100" className="cfm__needle cfm__needle--south" />
            <circle cx="100" cy="100" r="6" className="cfm__pivot" />
          </g>
        </svg>
        {/* Aura glow when active */}
        {activeFeature && <div className="cfm__aura" aria-hidden="true" />}
      </div>

      {/* Feature cards arranged in orbit */}
      <ul className="cfm__orbit" role="list" ref={containerRef}>
        {FEATURES.map((feature) => {
          const pos = polarToXY(feature.angle, CARD_ORBIT);
          const isActive = activeFeature === feature.id;
          return (
            <li
              key={feature.id}
              className={`cfm__feature-card${isActive ? ' cfm__feature-card--active' : ''}`}
              style={{
                '--card-x': `${pos.x}px`,
                '--card-y': `${pos.y}px`,
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isActive}
              onMouseEnter={() => setActiveFeature(feature.id)}
              onMouseLeave={() => setActiveFeature(null)}
              onFocus={() => setActiveFeature(feature.id)}
              onBlur={() => setActiveFeature(null)}
              onClick={() => setActiveFeature(isActive ? null : feature.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFeature(isActive ? null : feature.id);
                }
              }}
            >
              <strong className="cfm__feature-title">{feature.title}</strong>
              <p className="cfm__feature-desc">{feature.desc}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
