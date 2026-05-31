import React, { useRef, useState, useCallback } from 'react';

const TESTIMONIALS = [
  {
    id: 't1', name: 'Nguyễn Văn A', year: 'K66 CNTT', rating: 5,
    quote: 'UETCompass giúp mình xác định rõ hướng đi sau khi tốt nghiệp. Lộ trình rất thực tế!',
    initials: 'A',
  },
  {
    id: 't2', name: 'Trần Thị B', year: 'K67 KH Máy tính', rating: 5,
    quote: 'Skill Tree cực kỳ trực quan, mình biết chính xác mình đang ở đâu trong lộ trình.',
    initials: 'B',
  },
  {
    id: 't3', name: 'Lê Văn C', year: 'K65 Điện tử Viễn thông', rating: 4,
    quote: 'Tài nguyên học tập được tổng hợp tuyệt vời, tiết kiệm rất nhiều thời gian tìm kiếm.',
    initials: 'C',
  },
  {
    id: 't4', name: 'Phạm Thị D', year: 'K68 Khoa học dữ liệu', rating: 5,
    quote: 'Roadmap cộng đồng chất lượng cao, đặc biệt lộ trình AI/ML rất chi tiết.',
    initials: 'D',
  },
  {
    id: 't5', name: 'Hoàng Văn E', year: 'K66 Hệ thống Thông tin', rating: 5,
    quote: 'Tính năng onboarding giúp mình khởi đầu nhanh, không mất thời gian băn khoăn.',
    initials: 'E',
  },
  {
    id: 't6', name: 'Nguyễn Thị F', year: 'K67 CNTT', rating: 4,
    quote: 'Giao diện đẹp, dễ dùng. Mình cảm ơn team đã tạo ra một công cụ hắu ích như vậy!',
    initials: 'F',
  },
  {
    id: 't7', name: 'Đặng Văn G', year: 'K65 CNTT', rating: 5,
    quote: 'Phân tích mức độ phù hợp rất chính xác. Cảm giác như có mentor riêng.',
    initials: 'G',
  },
  {
    id: 't8', name: 'Võ Thị H', year: 'K68 CNTT', rating: 5,
    quote: 'Mình đã chia sẻ UETCompass cho cả lớp. Ai cũng thích tính năng roadmap cộng đồng.',
    initials: 'H',
  },
];

const ROW1 = TESTIMONIALS.slice(0, 4);
const ROW2 = TESTIMONIALS.slice(4, 8);

function StarRating({ value }) {
  return (
    <span className="tb-card__stars" aria-label={`Đánh giá ${value} sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"
          fill={i < value ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

function TestimonialCard({ item }) {
  return (
    <article className="tb-card" aria-label={`Đánh giá từ ${item.name}`}>
      <header className="tb-card__header">
        <div className="tb-card__avatar" aria-hidden="true">{item.initials}</div>
        <div>
          <strong className="tb-card__name">{item.name}</strong>
          <span className="tb-card__year">{item.year}</span>
        </div>
        <StarRating value={item.rating} />
      </header>
      <p className="tb-card__quote">{item.quote}</p>
    </article>
  );
}

function MarqueeRow({ items, direction = 'left', paused }) {
  const trackRef = useRef(null);
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onPointerDown = useCallback((e) => {
    const track = trackRef.current;
    if (!track) return;
    dragState.current = { active: true, startX: e.clientX, scrollLeft: track.scrollLeft };
    track.style.cursor = 'grabbing';
    track.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragState.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    const dx = e.clientX - dragState.current.startX;
    track.scrollLeft = dragState.current.scrollLeft - dx;
  }, []);

  const onPointerUp = useCallback(() => {
    dragState.current.active = false;
    const track = trackRef.current;
    if (track) track.style.cursor = 'grab';
  }, []);

  return (
    <div
      ref={trackRef}
      className={`tb-row tb-row--${direction}`}
      style={{ '--tb-paused': paused ? 'paused' : 'running' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      aria-label={direction === 'left' ? 'Hàng đánh giá 1' : 'Hàng đánh giá 2'}
    >
      {/* Duplicate items for seamless loop */}
      {[...items, ...items].map((item, idx) => (
        <TestimonialCard key={`${item.id}-${idx}`} item={item} />
      ))}
    </div>
  );
}

export default function TestimonialsBand() {
  const [paused, setPaused] = useState(false);

  return (
    <section
      id="testimonials"
      className="tb"
      aria-label="Đánh giá từ sinh viên"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="homepage-section-header">
        <h2>Sinh viên nói gì về UETCompass?</h2>
        <p className="homepage-section-sub">Hơn 1.200 sinh viên UET-VNU đã sử dụng và đánh giá tích cực.</p>
      </div>

      <div className="tb__band" aria-live="off">
        <MarqueeRow items={ROW1} direction="left" paused={paused} />
        <MarqueeRow items={ROW2} direction="right" paused={paused} />
      </div>

      {/* Accessible controls */}
      <div className="tb__controls">
        <button
          type="button"
          className="tb__control-btn"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Phát tự động' : 'Tạm dừng tự động'}
          aria-pressed={paused}
        >
          {paused ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="6" y1="4" x2="6" y2="20" />
              <line x1="18" y1="4" x2="18" y2="20" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
