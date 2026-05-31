/* eslint-disable react/prop-types */
import React from 'react';
import NodeResourcesList from './NodeResourcesList';

/**
 * T044: Resources tab - grouped materials rendering
 */

export default function ResourcesTab({ resources = [] }) {
  return <NodeResourcesList resources={resources} />;
}
