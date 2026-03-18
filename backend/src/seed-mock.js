const mongoose = require('mongoose');
require('dotenv').config();

const CourseUnitSchema = new mongoose.Schema({
	code: String,
	name: String,
	credits: Number,
	major: String,
	prerequisites: [String],
	seededAt: Date
});

const CourseUnit = mongoose.model('CourseUnit', CourseUnitSchema);

async function seed() {
	const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uetcompass';
	await mongoose.connect(MONGODB_URI);

	const courses = [
		{ code: "INT2204", name: "Lập trình hướng đối tượng", credits: 4, major: "Computer Science", prerequisites: [], seededAt: new Date() },
		{ code: "INT2210", name: "Cấu trúc dữ liệu và Giải thuật", credits: 4, major: "Computer Science", prerequisites: ["INT2204"], seededAt: new Date() },
		{ code: "INT2211", name: "Cơ sở dữ liệu", credits: 4, major: "Computer Science", prerequisites: [], seededAt: new Date() },
		{ code: "INT3306", name: "Phát triển ứng dụng web", credits: 3, major: "Computer Science", prerequisites: ["INT2211"], seededAt: new Date() }
	];

	await CourseUnit.deleteMany({ major: "Computer Science" });
	await CourseUnit.insertMany(courses);

	console.log('Mock courses seeded successfully');
	process.exit(0);
}

seed().catch(err => {
	console.error(err);
	process.exit(1);
});
