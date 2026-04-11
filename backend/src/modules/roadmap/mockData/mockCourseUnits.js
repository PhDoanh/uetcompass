// Mock data for a broader set of Computer Science courses
// Including: Giải tích 1, 2, Vật lý đại cương 1, 2, Kiến trúc máy tính, Nguyên lý hệ điều hành, ...

const MOCK_COURSE_UNITS = [
    { code: 'INT1008', name: 'Nhập môn lập trình', credits: 3, major: 'Computer Science', prerequisites: [], type: 'required' },
    { code: 'INT2204', name: 'Lập trình hướng đối tượng', credits: 4, major: 'Computer Science', prerequisites: ['INT1008'], type: 'required' },
    { code: 'INT2210', name: 'CTDL & Giải thuật', credits: 4, major: 'Computer Science', prerequisites: ['INT2204'], type: 'required' },
    { code: 'INT2211', name: 'Cơ sở dữ liệu', credits: 4, major: 'Computer Science', prerequisites: [], type: 'required' },
    { code: 'INT3306', name: 'Phát triển ứng dụng web', credits: 3, major: 'Computer Science', prerequisites: ['INT2211'], type: 'elective' },
    { code: 'MAT1101', name: 'Giải tích 1', credits: 4, major: 'Computer Science', prerequisites: [], type: 'required' },
    { code: 'MAT1201', name: 'Giải tích 2', credits: 4, major: 'Computer Science', prerequisites: ['MAT1101'], type: 'required' },
    { code: 'PHY1101', name: 'Vật lý đại cương 1', credits: 3, major: 'Computer Science', prerequisites: [], type: 'optional' },
    { code: 'PHY1201', name: 'Vật lý đại cương 2', credits: 3, major: 'Computer Science', prerequisites: ['PHY1101'], type: 'optional' },
    { code: 'CSE2301', name: 'Kiến trúc máy tính', credits: 3, major: 'Computer Science', prerequisites: ['INT1008'], type: 'required' },
    { code: 'CSE2401', name: 'Nguyên lý hệ điều hành', credits: 3, major: 'Computer Science', prerequisites: ['CSE2301'], type: 'required' },
    { code: 'INT3401', name: 'Trí tuệ nhân tạo', credits: 3, major: 'Computer Science', prerequisites: ['INT2210'], type: 'elective' },
    { code: 'INT3501', name: 'Khai phá dữ liệu', credits: 3, major: 'Computer Science', prerequisites: ['INT2211'], type: 'elective' },
    { code: 'INT3601', name: 'An toàn thông tin', credits: 3, major: 'Computer Science', prerequisites: ['INT2210'], type: 'elective' },
    { code: 'INT3701', name: 'Phát triển ứng dụng di động', credits: 3, major: 'Computer Science', prerequisites: ['INT2204'], type: 'optional' },
    { code: 'INT3801', name: 'Học máy', credits: 3, major: 'Computer Science', prerequisites: ['INT3401'], type: 'elective' },
    { code: 'ENG1001', name: 'Tiếng Anh chuyên ngành', credits: 2, major: 'Computer Science', prerequisites: [], type: 'optional' },
    { code: 'BUS2001', name: 'Khởi nghiệp công nghệ', credits: 2, major: 'Computer Science', prerequisites: [], type: 'optional' },
    { code: 'INT4101', name: 'Blockchain cơ bản', credits: 3, major: 'Computer Science', prerequisites: ['INT2211'], type: 'elective' },
    { code: 'INT4201', name: 'Phân tích thiết kế hệ thống', credits: 3, major: 'Computer Science', prerequisites: ['INT2210'], type: 'required' },
    { code: 'INT4301', name: 'Quản lý dự án phần mềm', credits: 3, major: 'Computer Science', prerequisites: ['INT4201'], type: 'optional' },
];

module.exports = MOCK_COURSE_UNITS;
