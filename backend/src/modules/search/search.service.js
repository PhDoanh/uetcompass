const { CourseUnit } = require('../curriculum/courseUnit.model');
const { Skill, Tag } = require('../tagging/tagging.model');

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function queryByKeyword(keyword) {
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
        throw { status: 400, code: 'INVALID_INPUT', message: 'keyword is required' };
    }

    const normalized = keyword.trim();
    const regex = new RegExp(escapeRegex(normalized), 'i');

    const [courses, skills] = await Promise.all([
        CourseUnit.find({
            $or: [
                { name: regex },
                { code: regex }
            ]
        })
            .limit(20)
            .lean(),
        Skill.find({ name: regex })
            .limit(20)
            .lean()
    ]);

    let tags = [];
    if (courses.length === 0 && skills.length === 0) {
        tags = await Tag.find({
            $or: [
                { normalizedName: regex },
                { name: regex }
            ]
        })
            .limit(20)
            .lean();
    }

    return {
        query: normalized,
        courses: courses.map(course => ({
            courseId: course._id,
            code: course.code,
            name: course.name,
            major: course.major,
            prerequisites: course.prerequisites || [],
        })),
        skills: skills.map(skill => ({
            skillId: skill._id,
            name: skill.name,
            description: skill.description || '',
            domain: skill.domain,
            tags: skill.tags || []
        })),
        tags: tags.map(tag => ({
            tagId: tag._id,
            name: tag.name,
            normalizedName: tag.normalizedName,
            category: tag.category,
        })),
        source: tags.length > 0 ? 'tags' : 'courses-and-skills',
    };
}

module.exports = {
    queryByKeyword,
};
