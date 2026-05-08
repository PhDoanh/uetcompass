/**
 * T011: Nodes Catalog Service
 * Accessor for RoadmapNode collection
 * Follows modular boundary pattern: reads from Feature 009 directly via Mongoose
 * 
 * The scraping module does not import from the roadmap module; instead,
 * it directly queries the roadmap_nodes collection for active nodes.
 */

const mongoose = require('mongoose');

/**
 * Fetch all active RoadmapNodes from MongoDB
 * Used by all three crawl pipelines (Academic, Trends, Resources)
 * 
 * @returns {Promise<Array>} Array of {_id, courseName} objects
 * @throws {Error} Database query error
 */
async function getActiveRoadmapNodes() {
  try {
    // Query roadmap_nodes collection directly
    // Assumes RoadmapNode model exists in the database (Feature 009)
    const nodes = await mongoose.connection
      .collection('roadmap_nodes')
      .find(
        { isActive: true },
        { projection: { _id: 1, courseName: 1 } }
      )
      .toArray();

    return nodes;
  } catch (error) {
    console.error('[NodesCatalog] Failed to fetch active roadmap nodes:', error.message);
    throw new Error(`Failed to fetch roadmap nodes: ${error.message}`);
  }
}

/**
 * Fetch a single RoadmapNode by ID
 * Convenience method for specific node lookups
 * 
 * @param {string|ObjectId} nodeId - The roadmap node ID
 * @returns {Promise<object>} RoadmapNode object or null if not found
 */
async function getRoadmapNodeById(nodeId) {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    const node = await mongoose.connection
      .collection('roadmap_nodes')
      .findOne({ _id: new ObjectId(nodeId) });

    return node;
  } catch (error) {
    console.error('[NodesCatalog] Failed to fetch roadmap node:', error.message);
    throw new Error(`Failed to fetch roadmap node: ${error.message}`);
  }
}

module.exports = {
  getActiveRoadmapNodes,
  getRoadmapNodeById
};
