
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import accountApi from '../../services/account.api';
import OnboardingPanel from '../onboarding/OnboardingPanel';
import SiteFooter from './SiteFooter';
import '../../style/general-component.css';

const ONBOARDING_REDIRECT_NOTICE_KEY = 'onboardingRedirectNotice';
const ONBOARDING_AUTO_OPEN_ONCE_KEY = 'onboardingAutoOpenOnce';

function resolveDisplayName(accessToken) {
  if (!accessToken || typeof window === 'undefined') {
    return null;
  }

  try {
    const payloadPart = accessToken.split('.')[1] || '';
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    const payload = JSON.parse(decoded);

    const displayName = String(payload?.displayName || payload?.fullName || payload?.name || '').trim();
    if (displayName) {
      return displayName;
    }

    const email = String(payload?.email || '').trim().toLowerCase();
    if (email.includes('@')) {
      return email.split('@')[0];
    }
  } catch (_) {
    return null;
  }

  return null;
}

export default function Homepage() {
  const { accessToken, onboardingState, logoutAndRedirect, updateAuthInfo } = useAuth();
  const [showOnboardingPanel, setShowOnboardingPanel] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const displayName = useMemo(() => resolveDisplayName(accessToken), [accessToken]);

  const shouldPromptOnboarding = useMemo(
    () => onboardingState !== 'COMPLETED' && Boolean(accessToken),
    [accessToken, onboardingState]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextMessage = window.sessionStorage.getItem(ONBOARDING_REDIRECT_NOTICE_KEY);
    if (!nextMessage) {
      return;
    }

    setPopupMessage(nextMessage);
    window.sessionStorage.removeItem(ONBOARDING_REDIRECT_NOTICE_KEY);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !accessToken || onboardingState === 'COMPLETED') {
      return;
    }

    const shouldAutoOpen = window.sessionStorage.getItem(ONBOARDING_AUTO_OPEN_ONCE_KEY) === '1';
    if (!shouldAutoOpen) {
      return;
    }

    setShowOnboardingPanel(true);
    window.sessionStorage.removeItem(ONBOARDING_AUTO_OPEN_ONCE_KEY);
  }, [accessToken, onboardingState]);

  useEffect(() => {
    let isMounted = true;

    async function loadDisplayName() {
      if (!accessToken) {
        if (isMounted) {
          setProfileDisplayName('');
        }
        return;
      }

      try {
        const result = await accountApi.getProfile(accessToken);
        const identity = result?.identity || {};
        const nextName = String(
          identity?.effectiveDisplayName || identity?.displayName || identity?.fullName || ''
        ).trim();

        if (isMounted) {
          setProfileDisplayName(nextName);
        }
      } catch (err) {
        if (err?.status === 401) {
          await logoutAndRedirect();
          return;
        }

        if (isMounted) {
          setProfileDisplayName('');
        }
      }
    }

    loadDisplayName();

    return () => {
      isMounted = false;
    };
  }, [accessToken, logoutAndRedirect]);

  const handleCloseOnboarding = (result) => {
    setShowOnboardingPanel(false);

    if (result) {
      updateAuthInfo?.({ onboardingState: 'COMPLETED', onboardingDraft: null });
    }
  };

  const handleOpenOnboarding = () => {
    setShowOnboardingPanel(true);
  };

  const roadmapTags = ['Fullstack Engineer', 'DevOps', 'Game Developer', 'Project Manager', 'Software Architect'];
  const socialAvatars = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAm3OZLEw_e4IktWDFZy2iAf8Cw1jTHvNOWvTQHGiNA3g6ZsV_radMO5HphkK6j_SVRQviUpbVRZpvTMyJliwOY2u7BrUoe_wJYBxLT5DB0AfyaUIasLCU2U2o3QiEGu6AfX947BwgkHovy7yugGuVY8qr-XDaJ-FbiEh2WzepR-0yCbMW0zJ0ptnst2hC86wDY6_4XC0VXSuMSSJXTQrob_LI76RHptUioHV6uOAQe5FNsrtUQEJLC8hbeprscLaunOelKDECmoAs',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBE4ZG-Jjw72WlNfuIVexhs5C8Mm_da1cflBQY_DCKqsS2xnQ44MRodSBQPPVmckSQcSYDnZbVa2Z01yUvJ9bjko2eHXnHh2AIfiOoCouhalixD_NhlElp1fS39nmFm46N_Bc7jsrLIY7WeSr9OX3rdispw5DdhGpbRQKl0VKl5y-AyCreS3YVZe8-5zrB4ZxE-aQfWVNQS-R6O5Q8TCHDZHBZfUgHe0P0N-8SQQCOr7migcmOcGnfhpO5OlaxeKKcCNCDUKQGyZ_4',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAUpvRyYC72x7gmoVa_gY8AltiVFaZ9TODyN9xlUefH-N86clFq2n0Ai-wCEvT1DpLWFZHub2pnUPVwz4ZkMUZp0cVYw1lntZpDldno4f02TdOw-SWmCn92gjdw5A6k_8mBsc3CYR5JASxpDx5OJij4s3rPop9-mgBITulxmTQKLuOxpMOzH7zQ5oyIftvPniVMSpc6YhLSTQ6BNn9CV_mnTK6jlHUDQXDtsEDxplybSY6ZCE-yvPMYt3MVahfbrQ5p8gIwrBVr0gg',
  ];

  const roadmapCards = [
    {
      title: 'Frontend Developer',
      description: 'Xây dựng giao diện người dùng hiện đại với React, Tailwind và các công cụ tối ưu trải nghiệm người dùng.',
      nodes: 24,
      level: 'Cơ bản',
      topic: 'Web',
      tone: 'blue',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_KjEMWczQ_DlajI_hjkXAGtP3A8sv0_IcV9TfIVujtWNy4Su8BkMBfLiFCcY9kpU9baKvKuFGigC1uLby1mTFXANHhUqRneCB-VA6s18ur2KauJKusNMJceUZiZO2weSEzx0X4JEkd-ZXji05HNsMKbxKQRbtXpkAdQsXQ_vQYI1bmy3vim1GPiHC9nq7RE2nAIr8e1XRlBaw80IutOJgENV1D9vYuiaOw1pH9TtjLRmEwevsBPHTlGR76tkhtE2k6ZmhdLHGLNY',
    },
    {
      title: 'Backend Architect',
      description: 'Xử lý hệ thống phân tán, kiến trúc microservices và quản lý cơ sở dữ liệu hiệu năng cao.',
      nodes: 32,
      level: 'Chuyên sâu',
      topic: 'Server',
      tone: 'orange',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYSoJRR8VzHWDof1M7MUQcGFSV9zLIpciEeDod-yBmKAb-potyDddD7ERCZ0DfkaAt61yqc9sn-gftzrbAxMNDoXoBMwT6D1oN3ka4K4dHQabHLionoQNDeIyks_TrswOTnIqNXLoYR22ur5_0k12wBy7eqhbGUtOO0GxTZOEdUoAWOp0mH05ueCN1h6bHKzOM7IYrHN_QTESQrUyeSf75L7DP3H-nODHoT_q6AIvhZgGiC5E3csWaLe1lQ0TM-KQdVRPPymnx77Y',
    },
    {
      title: 'AI Engineer',
      description: 'Làm chủ Machine Learning, Deep Learning và xử lý ngôn ngữ tự nhiên từ nền tảng toán học.',
      nodes: 45,
      level: 'Nâng cao',
      topic: 'AI/ML',
      tone: 'indigo',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKIvmh8PFkrJSxRTNIIEn6kv6zTQjxUV7F_zWPZjEELcvmXeRxAzuvY4kBwp-ObYZp-1zOB_F7vtLG9NDT5EEu1DlW_Ju_iDCqPFGMTN2aIMjbVqedsFZonyjJz7WaD7ZrmGvoaoOUr8P-YtvrJgFyBDr2NvwY018bcJWdsXcUbCu1DGfit586sEIXA_8Sa4IXw5xsgXAO-QXI-pyn80dljhGYEe4JhOEXu_jrqmQYkTMv6CQtWyPVLGj-NVZJCKxgWZFuguYYYXM',
    },
    {
      title: 'Mobile App Developer',
      description: 'Xây dựng ứng dụng di động đa nền tảng với Flutter hoặc Native development.',
      nodes: 28,
      level: 'Trung cấp',
      topic: 'App',
      tone: 'rose',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBz5KeexoRTuEcHjz22xRDyBsjuSTcd6o0ge2wS0aJXcjqHGl_1cDIPCbbNtTSMFkSfCggD0pZivkXTmmUquEa5XWSiNwWZn465sFBjH5HOscNpecRvtqLE5FhkT3bSo6X7dUifR5-hazIapk28ekgWhBXYoBrtnRplAGu1xDstL3hr4qB_019ZPxYEAcSA19zpn28eBNuyCMY-iYLrtfF0ZTs-yf0tFuGOfHa9que3WC_NL7NWzaou6PuVCH4j-JCY5VBhxr4vetY',
    },
    {
      title: 'Cyber Security',
      description: 'Phòng thủ và tấn công hệ thống, mật mã học và bảo mật hạ tầng mạng.',
      nodes: 35,
      level: 'Chuyên gia',
      topic: 'Security',
      tone: 'emerald',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9NESH4wHUUckrjtZS9Jl3gJkYMdoNeFX-Ru2MtHjjl_0BNx7hp-gduLWwMNCQLkGQzfz0eUCYj7uiGmYNRFtF74JmT5vWpOtsH6BzaLU-BpvJhL0W6Ti8cFfoiXftqiFbxCa91teE2Bt-5Tl0a6IcTJ9bOKjf8MfYNDaNECUqhCIL1VVNSYqsa6oe2JfqL31wjv6A4fc5nEbAnjDFGM2cL-BXdjNv6MdkRD90mhgP3oWjf78EUU0Fe9ayxNXspnWEtXsjHt5o2r8',
    },
    {
      title: 'Game Developer',
      description: 'Phát triển trò chơi 2D/3D với Unity, C# và các nguyên lý thiết kế game hiện đại.',
      nodes: 40,
      level: 'Nâng cao',
      topic: 'Game',
      tone: 'amber',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4qNBL4DQngN58jKn00hqhVGcpVt9TybosJPXhjgojqwsv0AQ55polYiCI_xk9j1DQtudMhyZlsZJ5WkV4j5yqDhoSMDwEdnROrSvw6JcVHywc5-sIWG9JZ8E7s9Y6HFJt2ip7UDph96GPAYyo4L8fQRqHh_g9bofS9AUPWYGd1IK-PxP39d01dSXD1kXLwKOBDBhv5IccSs_agWiZIoB9dQj3VZmQ-ur8pEkz3iecMfhsA3fVpkPJVRsjgbx5PUgXsrQaX58VADA',
    },
  ];

  return (
    <div className="homepage homepage--modern">
      <main className="homepage-content homepage-content--modern">
        <section className="homepage-hero-modern">
          <div className="homepage-hero-modern__content">
            <span className="homepage-status homepage-status--badge">
              {accessToken ? `Chào ${profileDisplayName || displayName || 'bạn'}` : 'Sản phẩm đứng TOP #3 của tháng'}
            </span>
            <h1 className="homepage-title">
              La bàn dẫn lối sự nghiệp <span className="homepage-title__nowrap">UET-ers</span>
            </h1>
            <p className="homepage-description">
              Khám phá các cây kỹ năng và lộ trình đào tạo được thiết kế riêng cho sinh viên Đại học Công nghệ,
              từ lập trình web đến trí tuệ nhân tạo.
            </p>

            <div className="homepage-hero-actions homepage-hero-actions--column">
              <a href="/sample-roadmap" className="homepage-wire-btn homepage-wire-btn--white">Khám phá Roadmap</a>
              {shouldPromptOnboarding ? (
                <button type="button" onClick={handleOpenOnboarding} className="homepage-wire-btn homepage-wire-btn--translucent">
                  Nhận roadmap cá nhân hóa
                </button>
              ) : accessToken ? (
                <a href="/learning-profile" className="homepage-wire-btn homepage-wire-btn--translucent">
                  Nhận roadmap cá nhân hóa
                </a>
              ) : (
                <a href="/register" className="homepage-wire-btn homepage-wire-btn--translucent">
                  Nhận roadmap cá nhân hóa
                </a>
              )}
            </div>

            <div className="homepage-social-proof" aria-label="Community stats">
              <div className="homepage-social-proof__avatars">
                {socialAvatars.map((avatar) => (
                  <img key={avatar} src={avatar} alt="Sinh viên UET" />
                ))}
                <span>+1.2k</span>
              </div>
              <p><strong>1,200+</strong> sinh viên đang sử dụng</p>
            </div>
          </div>

          <div className="homepage-hero-modern__visual" aria-hidden="true">
            <div className="hero-map-card hero-map-card--image">
              <img src="/images/uetstone.jpg" alt="UET Stone Roadmap" className="hero-map-image" />
            </div>
          </div>
        </section>

        <section className="homepage-section homepage-section--blank" aria-label="Roadmap gallery">
          <div className="homepage-roadmap-head">
            <div>
              <h2>Roadmap cộng đồng</h2>
              <p>Được tuyển chọn bởi cộng đồng UET-VNU dành cho mọi sinh viên.</p>
            </div>
            <div className="homepage-roadmap-controls">
              <button type="button" aria-label="Trước">‹</button>
              <button type="button" aria-label="Sau">›</button>
            </div>
          </div>

          <div className="homepage-roadmap-grid">
            {roadmapCards.map((card) => (
              <article key={card.title} className="homepage-roadmap-card">
                <div className="homepage-roadmap-card__image-wrap">
                  <img src={card.image} alt={card.title} className="homepage-roadmap-card__image" />
                  <div className="homepage-roadmap-card__chips">
                    <span className="homepage-chip homepage-chip--neutral">{card.level}</span>
                    <span className={`homepage-chip homepage-chip--${card.tone}`}>{card.topic}</span>
                  </div>
                </div>
                <div className="homepage-roadmap-card__body">
                  <h3 className="homepage-roadmap-card__title">{card.title}</h3>
                  <p className="homepage-roadmap-card__description">{card.description}</p>
                  <div className="homepage-roadmap-card__meta">
                    <small>{card.nodes} nodes</small>
                    <button type="button" className="homepage-card-action">Bắt đầu</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="homepage-bento">
          <div className="homepage-bento__main">
            <h2>Bạn là tân sinh viên?</h2>
            <p>
              Chúng tôi có lộ trình "Nhập môn" dành riêng cho các bạn K6x để nhanh chóng làm quen
              với môi trường đại học và phương pháp học tập mới.
            </p>
            <button type="button">Bắt đầu ngay</button>
          </div>

          <div className="homepage-bento__side">
            <h3>Tài liệu tham khảo</h3>
            <p>
              Kho lưu trữ slide bài giảng, đề thi cũ và tài liệu ôn tập được đóng góp bởi sinh viên các khóa.
            </p>
            <a href="#">Truy cập kho tài liệu</a>
          </div>
        </section>

        <SiteFooter />
      </main>

      {popupMessage ? (
        <div className="homepage-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="homepage-popup-title">
          <div className="homepage-popup">
            <h2 id="homepage-popup-title" className="homepage-popup__title">Thông báo</h2>
            <p className="homepage-popup__message">{popupMessage}</p>
            <div className="homepage-popup__actions">
              <button
                type="button"
                className="homepage-popup__button"
                onClick={() => setPopupMessage('')}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showOnboardingPanel && (
        <div className="homepage-onboarding-overlay">
          <OnboardingPanel
            authToken={accessToken}
            onUnauthorized={logoutAndRedirect}
            onCompleted={handleCloseOnboarding}
            onClose={handleCloseOnboarding}
          />
        </div>
      )}
    </div>
  );
}
