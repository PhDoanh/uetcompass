export default function SiteFooter() {
  return (
    <footer className="homepage-footer">
      <div className="homepage-footer__brand">
        <h4>UETCompass</h4>
        <p>La bàn dẫn lối cho hành trình học tập và phát triển sự nghiệp của sinh viên UET-VNU.</p>
      </div>
      <div className="homepage-footer__col">
        <h5>Tài nguyên</h5>
        <a href="#">Tài liệu</a>
        <a href="#">Cộng đồng</a>
        <a href="#">GitHub</a>
      </div>
      <div className="homepage-footer__col">
        <h5>Pháp lý</h5>
        <a href="#">Chính sách</a>
        <a href="#">Điều khoản</a>
      </div>
    </footer>
  );
}