export default function SiteFooter() {
  return (
    <footer className="homepage-footer">
      <div className="homepage-footer__nav">
        <div className="homepage-footer__nav-links">
          <a href="https://uet.vnu.edu.vn/">Đại học UET-VNU</a>
          <span className="homepage-footer__dot" aria-hidden="true">
            ·
          </span>
          <a href="https://tailieuvnu.com/">Tài nguyên học tập</a>
          <span className="homepage-footer__dot" aria-hidden="true">
            ·
          </span>
          <a href="https://github.com/PhDoanh/uetcompass.git">GitHub</a>
          <span className="homepage-footer__dot" aria-hidden="true">
            ·
          </span>
          <a href="#">Cộng đồng</a>
        </div>
      </div>
      <hr className="homepage-footer__rule" />
      <div className="homepage-footer__body">
        <div className="homepage-footer__left">
          <div className="homepage-footer__brand-row">
            <span className="homepage-footer__logo" aria-hidden="true">
              <img src="/favicon-compass.svg" alt="" className="homepage-footer__logo-icon" />
            </span>
            <h4>UETCompass</h4>
          </div>
          <p className="homepage-footer__description">
            La bàn dẫn lối cho hành trình học tập và phát triển sự nghiệp của sinh viên UET-VNU.
          </p>
          <div className="homepage-footer__email">
            <span className="homepage-footer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path
                  d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2v.2l8 5 8-5V8H4zm16 8v-6.2l-7.4 4.6a1.2 1.2 0 0 1-1.2 0L4 9.8V16h16z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <a href="mailto:contact@uetcompass.vn">contact@uetcompass.vn</a>
          </div>
          <div className="homepage-footer__policy">
            <a href="#">Chính sách bảo mật</a>
            <span className="homepage-footer__slash" aria-hidden="true">
              /
            </span>
            <a href="#">Điều khoản sử dụng</a>
          </div>
        </div>
        <div className="homepage-footer__right">
          <div className="homepage-footer__school">
            <div className="homepage-footer__school-text">
              <p className="homepage-footer__school-label">ĐẠI HỌC QUỐC GIA HÀ NỘI</p>
              <p className="homepage-footer__school-name">TRƯỜNG ĐẠI HỌC CÔNG NGHỆ</p>
              <p className="homepage-footer__school-en">UNIVERSITY OF ENGINEERING AND TECHNOLOGY</p>
            </div>
            <span className="homepage-footer__ico-badge">ICO</span>
          </div>
          <p className="homepage-footer__school-desc">
            Kết nối tri thức, mở đường tương lai và hỗ trợ sinh viên UET trên mọi chặng đường.
          </p>
          <button type="button" className="homepage-footer__cookie">
            <span className="homepage-footer__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path
                  d="M12 3a9 9 0 1 0 9 9c0-.4-.03-.8-.08-1.2-1.9.6-4-.3-4.7-2.1-.5-1.3.1-2.8 1.2-3.6A9 9 0 0 0 12 3zm-3.4 7.2a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0zm4.2 3.8a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0zm-4.8 2a1 1 0 1 1 2 0 1 1 0 0 1-2 0z"
                  fill="currentColor"
                />
              </svg>
            </span>
            Thiết lập Cookie
          </button>
        </div>
      </div>
      <hr className="homepage-footer__rule" />
      <div className="homepage-footer__copyright">© 2026 UETCompass · Phát triển bởi sinh viên UET</div>
    </footer>
  );
}