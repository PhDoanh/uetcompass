
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import accountApi from '../../services/account.api';
import OnboardingPanel from '../onboarding/OnboardingPanel';
import { useNotification } from '../notification/NotificationContainer';
import manualRoadmapApi from '../manual-roadmap/manualRoadmap.api';
import SiteFooter from './SiteFooter';
import { navigateTo } from '../../shared/navigation';
import '../../style/general-component.css';

const ONBOARDING_REDIRECT_NOTICE_KEY = 'onboardingRedirectNotice';
const ONBOARDING_AUTO_OPEN_ONCE_KEY = 'onboardingAutoOpenOnce';
const ROADMAPS_PER_PAGE = 10;
const MY_ROADMAPS_PER_PAGE = 5;
const MANUAL_ROADMAP_FETCH_LIMIT = 100;
const MAX_MANUAL_ROADMAP_FETCH_PAGES = 30;

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

function resolveUserId(accessToken) {
  if (!accessToken || typeof window === 'undefined') {
    return null;
  }

  try {
    const payloadPart = accessToken.split('.')[1] || '';
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    const payload = JSON.parse(decoded);
    const userId = String(payload?.userId || payload?.sub || '').trim();
    return userId || null;
  } catch (_) {
    return null;
  }
}

function formatRoadmapDate(value) {
  if (!value) {
    return 'N/A';
  }

  try {
    return `Cập nhật ${new Date(value).toLocaleDateString('vi-VN')}`;
  } catch (_) {
    return 'N/A';
  }
}

export default function Homepage() {
  const { accessToken, onboardingState, logoutAndRedirect, updateAuthInfo } = useAuth();
  const { addNotification } = useNotification();
  const [showOnboardingPanel, setShowOnboardingPanel] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [publicRoadmaps, setPublicRoadmaps] = useState([]);
  const [myManualRoadmaps, setMyManualRoadmaps] = useState([]);
  const [isLoadingMyManualRoadmaps, setIsLoadingMyManualRoadmaps] = useState(false);
  const [openingRoadmapTitle, setOpeningRoadmapTitle] = useState('');
  const [roadmapPage, setRoadmapPage] = useState(0);
  const [myRoadmapPage, setMyRoadmapPage] = useState(0);
  const displayName = useMemo(() => resolveDisplayName(accessToken), [accessToken]);
  const userId = useMemo(() => resolveUserId(accessToken), [accessToken]);

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

    addNotification(nextMessage, 'warning');
    window.sessionStorage.removeItem(ONBOARDING_REDIRECT_NOTICE_KEY);
  }, [addNotification]);

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

    async function loadPublicRoadmaps() {
      try {
        const result = await manualRoadmapApi.listPublicManualRoadmaps({ limit: 6 });
        if (isMounted) {
          setPublicRoadmaps(result.items || []);
        }
      } catch (err) {
        // Silently fail for public roadmaps
        if (isMounted) {
          setPublicRoadmaps([]);
        }
      }
    }

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

    async function loadMyManualRoadmaps() {
      if (!accessToken) {
        if (isMounted) {
          setMyManualRoadmaps([]);
          setIsLoadingMyManualRoadmaps(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingMyManualRoadmaps(true);
      }

      try {
        const items = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages && page <= MAX_MANUAL_ROADMAP_FETCH_PAGES) {
          const result = await manualRoadmapApi.listManualRoadmaps(accessToken, {
            page,
            limit: MANUAL_ROADMAP_FETCH_LIMIT,
          });

          const pageItems = Array.isArray(result?.items) ? result.items : [];
          items.push(...pageItems);

          const total = Number(result?.pagination?.total || items.length);
          totalPages = Math.max(1, Math.ceil(total / MANUAL_ROADMAP_FETCH_LIMIT));

          if (pageItems.length === 0) {
            break;
          }

          page += 1;
        }

        if (isMounted) {
          setMyManualRoadmaps(items);
        }
      } catch (err) {
        if (err?.status === 401) {
          await logoutAndRedirect();
          return;
        }

        try {
          const normalizedUserId = String(userId || '').trim();
          const ownRoadmaps = [];
          let page = 1;
          let totalPages = 1;

          while (page <= totalPages && page <= MAX_MANUAL_ROADMAP_FETCH_PAGES) {
            const fallback = await manualRoadmapApi.listPublicManualRoadmaps({
              page,
              limit: MANUAL_ROADMAP_FETCH_LIMIT,
            });
            const fallbackItems = Array.isArray(fallback?.items) ? fallback.items : [];

            ownRoadmaps.push(
              ...fallbackItems.filter((roadmap) => String(roadmap?.userId || '').trim() === normalizedUserId)
            );

            const total = Number(fallback?.pagination?.total || ownRoadmaps.length);
            totalPages = Math.max(1, Math.ceil(total / MANUAL_ROADMAP_FETCH_LIMIT));

            if (fallbackItems.length === 0) {
              break;
            }

            page += 1;
          }

          if (isMounted) {
            setMyManualRoadmaps(ownRoadmaps);
          }
        } catch (_) {
          if (isMounted) {
            setMyManualRoadmaps([]);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingMyManualRoadmaps(false);
        }
      }
    }

    loadPublicRoadmaps();
    loadDisplayName();
    loadMyManualRoadmaps();

    return () => {
      isMounted = false;
    };
  }, [accessToken, logoutAndRedirect, userId]);

  const handleCloseOnboarding = (result) => {
    setShowOnboardingPanel(false);

    if (result) {
      updateAuthInfo?.({ onboardingState: 'COMPLETED', onboardingDraft: null });
    }
  };

  const handleOpenOnboarding = () => {
    setShowOnboardingPanel(true);
  };

  const handleOpenRoadmapCard = async (cardTitle) => {
    const normalizedTitle = String(cardTitle || '').trim();
    if (!normalizedTitle || typeof window === 'undefined') {
      return;
    }

    setOpeningRoadmapTitle(normalizedTitle);

    try {
      const localMatch = publicRoadmaps.find(
        (roadmap) => String(roadmap?.title || '').trim().toLowerCase() === normalizedTitle.toLowerCase()
      );

      let matchedRoadmap = localMatch || null;

      if (!matchedRoadmap) {
        const searchResult = await manualRoadmapApi.listPublicManualRoadmaps({ q: normalizedTitle, page: 1, limit: 20 });
        const items = Array.isArray(searchResult?.items) ? searchResult.items : [];

        matchedRoadmap = items.find(
          (roadmap) => String(roadmap?.title || '').trim().toLowerCase() === normalizedTitle.toLowerCase()
        ) || items[0] || null;
      }

      const roadmapId = String(matchedRoadmap?._id || '').trim();
      if (!roadmapId) {
        throw new Error('Không tìm thấy roadmap công khai phù hợp.');
      }

      navigateTo(`/skill-tree/${encodeURIComponent(roadmapId)}`);
    } catch (_) {
      setPopupMessage('Không thể mở roadmap lúc này. Vui lòng thử lại sau.');
    } finally {
      setOpeningRoadmapTitle('');
    }
  };

  const roadmapTags = ['Fullstack Engineer', 'DevOps', 'Game Developer', 'Project Manager', 'Software Architect'];
  const socialAvatars = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAm3OZLEw_e4IktWDFZy2iAf8Cw1jTHvNOWvTQHGiNA3g6ZsV_radMO5HphkK6j_SVRQviUpbVRZpvTMyJliwOY2u7BrUoe_wJYBxLT5DB0AfyaUIasLCU2U2o3QiEGu6AfX947BwgkHovy7yugGuVY8qr-XDaJ-FbiEh2WzepR-0yCbMW0zJ0ptnst2hC86wDY6_4XC0VXSuMSSJXTQrob_LI76RHptUioHV6uOAQe5FNsrtUQEJLC8hbeprscLaunOelKDECmoAs',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBE4ZG-Jjw72WlNfuIVexhs5C8Mm_da1cflBQY_DCKqsS2xnQ44MRodSBQPPVmckSQcSYDnZbVa2Z01yUvJ9bjko2eHXnHh2AIfiOoCouhalixD_NhlElp1fS39nmFm46N_Bc7jsrLIY7WeSr9OX3rdispw5DdhGpbRQKl0VKl5y-AyCreS3YVZe8-5zrB4ZxE-aQfWVNQS-R6O5Q8TCHDZHBZfUgHe0P0N-8SQQCOr7migcmOcGnfhpO5OlaxeKKcCNCDUKQGyZ_4',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAUpvRyYC72x7gmoVa_gY8AltiVFaZ9TODyN9xlUefH-N86clFq2n0Ai-wCEvT1DpLWFZHub2pnUPVwz4ZkMUZp0cVYw1lntZpDldno4f02TdOw-SWmCn92gjdw5A6k_8mBsc3CYR5JASxpDx5OJij4s3rPop9-mgBITulxmTQKLuOxpMOzH7zQ5oyIftvPniVMSpc6YhLSTQ6BNn9CV_mnTK6jlHUDQXDtsEDxplybSY6ZCE-yvPMYt3MVahfbrQ5p8gIwrBVr0gg',
  ];

  const roadmapCards = [
    {
      title: 'Frontend Developer Roadmap',
      description: 'Xây dựng giao diện người dùng hiện đại với React, Tailwind và các công cụ tối ưu trải nghiệm người dùng.',
      nodes: 24,
      level: 'Cơ bản',
      topic: 'Web',
      tone: 'blue',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_KjEMWczQ_DlajI_hjkXAGtP3A8sv0_IcV9TfIVujtWNy4Su8BkMBfLiFCcY9kpU9baKvKuFGigC1uLby1mTFXANHhUqRneCB-VA6s18ur2KauJKusNMJceUZiZO2weSEzx0X4JEkd-ZXji05HNsMKbxKQRbtXpkAdQsXQ_vQYI1bmy3vim1GPiHC9nq7RE2nAIr8e1XRlBaw80IutOJgENV1D9vYuiaOw1pH9TtjLRmEwevsBPHTlGR76tkhtE2k6ZmhdLHGLNY',
    },
    {
      title: 'Backend Architect Roadmap',
      description: 'Xử lý hệ thống phân tán, kiến trúc microservices và quản lý cơ sở dữ liệu hiệu năng cao.',
      nodes: 32,
      level: 'Chuyên sâu',
      topic: 'Server',
      tone: 'orange',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYSoJRR8VzHWDof1M7MUQcGFSV9zLIpciEeDod-yBmKAb-potyDddD7ERCZ0DfkaAt61yqc9sn-gftzrbAxMNDoXoBMwT6D1oN3ka4K4dHQabHLionoQNDeIyks_TrswOTnIqNXLoYR22ur5_0k12wBy7eqhbGUtOO0GxTZOEdUoAWOp0mH05ueCN1h6bHKzOM7IYrHN_QTESQrUyeSf75L7DP3H-nODHoT_q6AIvhZgGiC5E3csWaLe1lQ0TM-KQdVRPPymnx77Y',
    },
    {
      title: 'AI Engineer Roadmap',
      description: 'Làm chủ Machine Learning, Deep Learning và xử lý ngôn ngữ tự nhiên từ nền tảng toán học.',
      nodes: 45,
      level: 'Nâng cao',
      topic: 'AI/ML',
      tone: 'indigo',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKIvmh8PFkrJSxRTNIIEn6kv6zTQjxUV7F_zWPZjEELcvmXeRxAzuvY4kBwp-ObYZp-1zOB_F7vtLG9NDT5EEu1DlW_Ju_iDCqPFGMTN2aIMjbVqedsFZonyjJz7WaD7ZrmGvoaoOUr8P-YtvrJgFyBDr2NvwY018bcJWdsXcUbCu1DGfit586sEIXA_8Sa4IXw5xsgXAO-QXI-pyn80dljhGYEe4JhOEXu_jrqmQYkTMv6CQtWyPVLGj-NVZJCKxgWZFuguYYYXM',
    },
    {
      title: 'Mobile App Developer Roadmap',
      description: 'Xây dựng ứng dụng di động đa nền tảng với Flutter hoặc Native development.',
      nodes: 28,
      level: 'Trung cấp',
      topic: 'App',
      tone: 'rose',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBz5KeexoRTuEcHjz22xRDyBsjuSTcd6o0ge2wS0aJXcjqHGl_1cDIPCbbNtTSMFkSfCggD0pZivkXTmmUquEa5XWSiNwWZn465sFBjH5HOscNpecRvtqLE5FhkT3bSo6X7dUifR5-hazIapk28ekgWhBXYoBrtnRplAGu1xDstL3hr4qB_019ZPxYEAcSA19zpn28eBNuyCMY-iYLrtfF0ZTs-yf0tFuGOfHa9que3WC_NL7NWzaou6PuVCH4j-JCY5VBhxr4vetY',
    },
    {
      title: 'Cyber Security Roadmap',
      description: 'Phòng thủ và tấn công hệ thống, mật mã học và bảo mật hạ tầng mạng.',
      nodes: 35,
      level: 'Chuyên gia',
      topic: 'Security',
      tone: 'emerald',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9NESH4wHUUckrjtZS9Jl3gJkYMdoNeFX-Ru2MtHjjl_0BNx7hp-gduLWwMNCQLkGQzfz0eUCYj7uiGmYNRFtF74JmT5vWpOtsH6BzaLU-BpvJhL0W6Ti8cFfoiXftqiFbxCa91teE2Bt-5Tl0a6IcTJ9bOKjf8MfYNDaNECUqhCIL1VVNSYqsa6oe2JfqL31wjv6A4fc5nEbAnjDFGM2cL-BXdjNv6MdkRD90mhgP3oWjf78EUU0Fe9ayxNXspnWEtXsjHt5o2r8',
    },
    {
      title: 'Game Developer Roadmap',
      description: 'Phát triển trò chơi 2D/3D với Unity, C# và các nguyên lý thiết kế game hiện đại.',
      nodes: 40,
      level: 'Nâng cao',
      topic: 'Game',
      tone: 'amber',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4qNBL4DQngN58jKn00hqhVGcpVt9TybosJPXhjgojqwsv0AQ55polYiCI_xk9j1DQtudMhyZlsZJ5WkV4j5yqDhoSMDwEdnROrSvw6JcVHywc5-sIWG9JZ8E7s9Y6HFJt2ip7UDph96GPAYyo4L8fQRqHh_g9bofS9AUPWYGd1IK-PxP39d01dSXD1kXLwKOBDBhv5IccSs_agWiZIoB9dQj3VZmQ-ur8pEkz3iecMfhsA3fVpkPJVRsjgbx5PUgXsrQaX58VADA',
    },
    {
      title: 'Cloud DevOps Roadmap',
      description: 'Nắm vững nền tảng cloud, CI/CD, containers, monitoring và triển khai hệ thống production ổn định.',
      nodes: 34,
      level: 'Chuyên sâu',
      topic: 'DevOps',
      tone: 'orange',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Data Analytics Roadmap',
      description: 'Rèn luyện kỹ năng phân tích dữ liệu với Excel, SQL, trực quan hóa và storytelling cho nghiệp vụ thực tế.',
      nodes: 30,
      level: 'Trung cấp',
      topic: 'Analytics',
      tone: 'blue',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Fullstack Engineering Extended Roadmap',
      description: 'Lộ trình fullstack mở rộng với frontend, backend, database, testing và kiến trúc triển khai thực chiến.',
      nodes: 48,
      level: 'Nâng cao',
      topic: 'Fullstack',
      tone: 'indigo',
      image: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Frontend Foundations Roadmap',
      description: 'Bắt đầu với HTML, CSS, JavaScript, Internet fundamentals và bộ công cụ frontend căn bản.',
      nodes: 22,
      level: 'Cơ bản',
      topic: 'Frontend',
      tone: 'rose',
      image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Render Showcase Roadmap',
      description: 'Khám phá lộ trình đồ họa render: pipeline 3D, ánh sáng, vật liệu và tối ưu hiệu năng hiển thị.',
      nodes: 26,
      level: 'Trung cấp',
      topic: 'Graphics',
      tone: 'emerald',
      image: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  const totalRoadmapPages = Math.max(1, Math.ceil(roadmapCards.length / ROADMAPS_PER_PAGE));
  const canGoPrevRoadmapPage = roadmapPage > 0;
  const canGoNextRoadmapPage = roadmapPage < totalRoadmapPages - 1;
  const visibleRoadmapCards = roadmapCards.slice(
    roadmapPage * ROADMAPS_PER_PAGE,
    (roadmapPage + 1) * ROADMAPS_PER_PAGE
  );
  const isSingleRoadmapCardPage = visibleRoadmapCards.length === 1;
  const hasPersonalizedRoadmap = onboardingState === 'COMPLETED' && Boolean(accessToken);
  const myManualRoadmapCards = Array.isArray(myManualRoadmaps)
    ? myManualRoadmaps.filter((roadmap) => String(roadmap?._id || '').trim())
    : [];
  const myRoadmapCards = [
    ...(hasPersonalizedRoadmap ? [{ kind: 'personalized', id: 'personalized' }] : []),
    ...myManualRoadmapCards.map((roadmap) => ({ kind: 'manual', id: String(roadmap?._id || '').trim(), roadmap })),
  ];
  const totalMyRoadmapPages = Math.max(1, Math.ceil(myRoadmapCards.length / MY_ROADMAPS_PER_PAGE));
  const canGoPrevMyRoadmapPage = myRoadmapPage > 0;
  const canGoNextMyRoadmapPage = myRoadmapPage < totalMyRoadmapPages - 1;
  const visibleMyRoadmapCards = myRoadmapCards.slice(
    myRoadmapPage * MY_ROADMAPS_PER_PAGE,
    (myRoadmapPage + 1) * MY_ROADMAPS_PER_PAGE
  );
  const shouldShowMyRoadmapsSection = Boolean(accessToken) && (hasPersonalizedRoadmap || myManualRoadmapCards.length > 0);

  const handlePrevRoadmapPage = () => {
    setRoadmapPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextRoadmapPage = () => {
    setRoadmapPage((prev) => Math.min(totalRoadmapPages - 1, prev + 1));
  };

  const handlePrevMyRoadmapPage = () => {
    setMyRoadmapPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextMyRoadmapPage = () => {
    setMyRoadmapPage((prev) => Math.min(totalMyRoadmapPages - 1, prev + 1));
  };

  useEffect(() => {
    setMyRoadmapPage((prev) => Math.min(prev, totalMyRoadmapPages - 1));
  }, [totalMyRoadmapPages]);

  return (
    <div className="homepage homepage--modern">
      <main className="homepage-content homepage-content--modern">
        <section id="featured-features" className="homepage-hero-modern">
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
              <a href="#roadmap-community" className="homepage-wire-btn homepage-wire-btn--white">Khám phá Roadmap</a>
              {shouldPromptOnboarding ? (
                <button type="button" onClick={handleOpenOnboarding} className="homepage-wire-btn homepage-wire-btn--translucent">
                  Nhận roadmap cá nhân hóa
                </button>
              ) : accessToken ? (
                <a href="/skill-tree" className="homepage-wire-btn homepage-wire-btn--translucent">
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

        {shouldShowMyRoadmapsSection ? (
          <section id="my-roadmaps" className="homepage-section homepage-section--plain" aria-label="My roadmap gallery">
            <div className="homepage-roadmap-head">
              <div>
                <h2>Roadmap của tôi</h2>
                <p>Không gian roadmap dành riêng cho tài khoản của bạn.</p>
              </div>
              <div className="homepage-roadmap-controls">
                <button
                  type="button"
                  aria-label="Trước"
                  onClick={handlePrevMyRoadmapPage}
                  disabled={!canGoPrevMyRoadmapPage}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Sau"
                  onClick={handleNextMyRoadmapPage}
                  disabled={!canGoNextMyRoadmapPage}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="homepage-roadmap-grid">
              {visibleMyRoadmapCards.map((card) => {
                if (card.kind === 'personalized') {
                  return (
                    <article key={card.id} className="homepage-roadmap-card homepage-roadmap-card--featured">
                      <div className="homepage-roadmap-card__image-wrap">
                        <img src="/images/uetstone.jpg" alt="Roadmap cá nhân hóa" className="homepage-roadmap-card__image" />
                        <div className="homepage-roadmap-card__chips">
                          <span className="homepage-chip homepage-chip--neutral">Sẵn sàng</span>
                          <span className="homepage-chip homepage-chip--indigo">Skill Tree</span>
                        </div>
                      </div>
                      <div className="homepage-roadmap-card__body">
                        <h3 className="homepage-roadmap-card__title">
                          Roadmap cá nhân hóa
                          <span className="homepage-feature-pill">Nổi bật</span>
                        </h3>
                        <p className="homepage-roadmap-card__description">
                          Đã hoàn tất onboarding, bạn có thể học theo skill tree cá nhân hóa.
                        </p>
                        <div className="homepage-roadmap-card__meta">
                          <small>Sẵn sàng học tập</small>
                          <button
                            type="button"
                            className="homepage-card-action"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                navigateTo('/skill-tree');
                              }
                            }}
                          >
                            Mở skill tree
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }

                const roadmap = card.roadmap;
                const roadmapId = card.id;
                const roadmapTitle = String(roadmap?.title || '').trim() || 'Roadmap tạo thủ công';
                const roadmapDescription = String(roadmap?.description || '').trim() || 'Roadmap thủ công do bạn tạo.';
                const roadmapMeta = formatRoadmapDate(roadmap?.updatedAt || roadmap?.createdAt || null);

                return (
                  <article key={roadmapId} className="homepage-roadmap-card">
                    <div className="homepage-roadmap-card__image-wrap">
                      <img
                        src="https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1200&q=80"
                        alt={roadmapTitle}
                        className="homepage-roadmap-card__image"
                      />
                      <div className="homepage-roadmap-card__chips">
                        <span className="homepage-chip homepage-chip--neutral">Đã có</span>
                        <span className="homepage-chip homepage-chip--blue">Manual</span>
                      </div>
                    </div>
                    <div className="homepage-roadmap-card__body">
                      <h3 className="homepage-roadmap-card__title">{roadmapTitle}</h3>
                      <p className="homepage-roadmap-card__description">{roadmapDescription}</p>
                      <div className="homepage-roadmap-card__meta">
                        <small>{roadmapMeta}</small>
                        <button
                          type="button"
                          className="homepage-card-action"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              navigateTo(`/manual-roadmap?id=${encodeURIComponent(roadmapId)}`);
                            }
                          }}
                        >
                          Mở roadmap
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section id="roadmap-community" className="homepage-section homepage-section--plain" aria-label="Roadmap gallery">
          <div className="homepage-roadmap-head">
            <div>
              <h2>Roadmap cộng đồng</h2>
              <p>Được tuyển chọn bởi cộng đồng UET-VNU dành cho mọi sinh viên.</p>
            </div>
            <div className="homepage-roadmap-controls">
              <button
                type="button"
                aria-label="Trước"
                onClick={handlePrevRoadmapPage}
                disabled={!canGoPrevRoadmapPage}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Sau"
                onClick={handleNextRoadmapPage}
                disabled={!canGoNextRoadmapPage}
              >
                ›
              </button>
            </div>
          </div>

          <div className={`homepage-roadmap-grid${isSingleRoadmapCardPage ? ' homepage-roadmap-grid--single' : ''}`}>
            {visibleRoadmapCards.map((card) => (
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
                    <button
                      type="button"
                      className="homepage-card-action"
                      onClick={() => handleOpenRoadmapCard(card.title)}
                      disabled={openingRoadmapTitle === card.title}
                    >
                      {openingRoadmapTitle === card.title ? 'Đang mở...' : 'Bắt đầu'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="homepage-bento">
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
