const DEFAULT_CRON_SCHEDULE = '0 0 1 3,8 *';

const urls = [
	// { url: 'https://uet.vnu.edu.vn/chuong-trinh-dao-tao-nganh-cntt/', major: 'CNTT' },
	// { url: 'https://uet.vnu.edu.vn/chuong-trinh-dao-tao-nganh-ktmt/', major: 'KTMT' },
];

module.exports = {
	urls,
	cronSchedule: process.env.SEED_CRON_SCHEDULE || DEFAULT_CRON_SCHEDULE,
};
