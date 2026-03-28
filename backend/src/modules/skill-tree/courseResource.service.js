/**
 * T038: Course resources read service
 * Reads from course_resources collection and groups by type
 * Currently returns placeholder structure; real implementation would query MongoDB
 */

async function getResources(courseCode) {
  // TODO: Implement MongoDB query to course_resources collection
  // Expected schema per resource:
  // {
  //   courseCode: String,
  //   type: 'textbook' | 'slide' | 'lab' | 'assignment',
  //   title: String,
  //   url: String,
  //   description: String
  // }
  
  const resourcesByType = {
    textbooks: [],      // [{ title, url, description }]
    slides: [],         // [{ title, url, description }]
    labs: [],           // [{ title, url, description }]
    assignments: [],    // [{ title, url, description }]
  };

  return resourcesByType;
}

module.exports = {
  getResources,
};
