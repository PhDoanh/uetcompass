// Mock resource and skill data for each course in MOCK_COURSE_UNITS
// Key: courseCode, Value: { skills: [...], resources: [...] }

const mockCourseResource = {
  'INT1008': {
    skills: ['Cơ bản lập trình', 'Tư duy giải quyết vấn đề', 'Biến, vòng lặp, hàm'],
    resources: [
      { title: 'Codelearn Nhập môn lập trình', url: 'https://codelearn.io/sharing/nhap-mon-lap-trinh' },
      { title: 'freeCodeCamp JavaScript', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/' }
    ]
  },
  'INT2204': {
    skills: ['OOP', 'Class & Object', 'Kế thừa', 'Đa hình'],
    resources: [
      { title: 'Codecademy OOP', url: 'https://www.codecademy.com/learn/learn-java' },
      { title: 'Lập trình hướng đối tượng C++', url: 'https://www.geeksforgeeks.org/object-oriented-programming-in-cpp/' }
    ]
  },
  'INT2210': {
    skills: ['Cấu trúc dữ liệu', 'Giải thuật', 'Phân tích độ phức tạp'],
    resources: [
      { title: 'GeeksforGeeks Data Structures', url: 'https://www.geeksforgeeks.org/data-structures/' },
      { title: 'MIT Algorithms', url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/' }
    ]
  },
  'INT2211': {
    skills: ['SQL', 'Thiết kế CSDL', 'Truy vấn dữ liệu'],
    resources: [
      { title: 'Khan Academy SQL', url: 'https://www.khanacademy.org/computing/computer-programming/sql' },
      { title: 'W3Schools SQL', url: 'https://www.w3schools.com/sql/' }
    ]
  },
  'INT3306': {
    skills: ['Web Development', 'HTML', 'CSS', 'JavaScript'],
    resources: [
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn' },
      { title: 'freeCodeCamp Responsive Web Design', url: 'https://www.freecodecamp.org/learn/responsive-web-design/' }
    ]
  },
  'MAT1101': {
    skills: ['Giải tích cơ bản', 'Đạo hàm', 'Tích phân'],
    resources: [
      { title: 'Khan Academy Calculus 1', url: 'https://www.khanacademy.org/math/calculus-1' }
    ]
  },
  'MAT1201': {
    skills: ['Chuỗi số', 'Hàm nhiều biến', 'Tích phân bội'],
    resources: [
      { title: 'Khan Academy Calculus 2', url: 'https://www.khanacademy.org/math/calculus-2' }
    ]
  },
  'PHY1101': {
    skills: ['Cơ học', 'Nhiệt học'],
    resources: [
      { title: 'Vật lý đại cương 1', url: 'https://www.youtube.com/watch?v=Q1y3Yn5Lq3g' }
    ]
  },
  'PHY1201': {
    skills: ['Điện học', 'Quang học'],
    resources: [
      { title: 'Vật lý đại cương 2', url: 'https://www.youtube.com/watch?v=Q1y3Yn5Lq3g' }
    ]
  },
  'CSE2301': {
    skills: ['Kiến trúc máy tính', 'Tổ chức bộ nhớ', 'CPU'],
    resources: [
      { title: 'Computer Architecture', url: 'https://www.coursera.org/learn/comparch' }
    ]
  },
  'CSE2401': {
    skills: ['Quản lý tiến trình', 'Bộ nhớ ảo', 'Hệ điều hành'],
    resources: [
      { title: 'Operating Systems: Three Easy Pieces', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/' }
    ]
  },
  'INT3401': {
    skills: ['AI cơ bản', 'Tìm kiếm', 'Heuristic'],
    resources: [
      { title: 'AI Stanford', url: 'https://www.youtube.com/playlist?list=PLoROMvodv4rO1NB9TD4iUZ3qghGEGtqNX' }
    ]
  },
  'INT3501': {
    skills: ['Khai phá dữ liệu', 'Data Mining'],
    resources: [
      { title: 'Data Mining', url: 'https://www.coursera.org/learn/data-mining' }
    ]
  },
  'INT3601': {
    skills: ['Bảo mật', 'Mã hóa', 'An toàn hệ thống'],
    resources: [
      { title: 'Information Security', url: 'https://www.coursera.org/specializations/information-security' }
    ]
  },
  'INT3701': {
    skills: ['Mobile App', 'Android', 'iOS'],
    resources: [
      { title: 'Android Developer', url: 'https://developer.android.com/courses' }
    ]
  },
  'INT3801': {
    skills: ['Machine Learning', 'Supervised Learning'],
    resources: [
      { title: 'Machine Learning by Andrew Ng', url: 'https://www.coursera.org/learn/machine-learning' }
    ]
  },
  'ENG1001': {
    skills: ['Tiếng Anh chuyên ngành', 'Đọc hiểu tài liệu kỹ thuật'],
    resources: [
      { title: 'English for IT', url: 'https://www.udemy.com/course/english-for-information-technology/' }
    ]
  },
  'BUS2001': {
    skills: ['Khởi nghiệp', 'Kỹ năng kinh doanh'],
    resources: [
      { title: 'Startup School', url: 'https://www.startupschool.org/' }
    ]
  },
  'INT4101': {
    skills: ['Blockchain', 'Smart Contract'],
    resources: [
      { title: 'Blockchain Basics', url: 'https://www.coursera.org/learn/blockchain-basics' }
    ]
  },
  'INT4201': {
    skills: ['Phân tích hệ thống', 'Thiết kế hệ thống'],
    resources: [
      { title: 'System Analysis and Design', url: 'https://www.udemy.com/course/system-analysis-and-design/' }
    ]
  },
  'INT4301': {
    skills: ['Quản lý dự án', 'Lập kế hoạch'],
    resources: [
      { title: 'Project Management', url: 'https://www.coursera.org/specializations/project-management' }
    ]
  },
};

module.exports = mockCourseResource;
