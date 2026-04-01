// 1st day of March and August at midnight
const DEFAULT_CRON_SCHEDULE = '0 0 1 3,8 *';

const urls = [
	{ url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-13/', major: 'Công nghệ thông tin' },
	{ url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-chat-luong-cao-10/', major: 'Công nghệ thông tin chất lượng cao' },
	{ url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-cong-nghe-thong-tin-dinh-huong-thi-truong-nhat-ban-10/', major: 'Công nghệ thông tin định hướng thị trường Nhật Bản' },
	{ url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-khoa-hoc-may-tinh-30/', major: 'Khoa học máy tính' },
	{ url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-khoa-hoc-may-tinh-chat-luong-cao-10/', major: 'Khoa học máy tính chất lượng cao' },
	{ url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-thong-thong-tin-30/', major: 'Hệ thống thông tin' },
	{ url: 'https://uet.edu.vn/chuong-trinh-dao-tao-nganh-mang-may-tinh-va-truyen-thong-du-lieu-22/', major: 'Mạng máy tính và truyền thông dữ liệu' },
];

module.exports = {
	urls,
	cronSchedule: process.env.SEED_CRON_SCHEDULE || DEFAULT_CRON_SCHEDULE,
};
