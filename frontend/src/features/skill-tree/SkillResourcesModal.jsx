import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import * as skillTreeApi from '../../services/skillTree.api';

/**
 * T053: Skill resources modal - free/paid learning resources
 */

export default function SkillResourcesModal({ skillName, onClose = () => {} }) {
  const [resources, setResources] = useState({ free: [], paid: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken') || '';
        const data = await skillTreeApi.getLearningResources(token, skillName);
        setResources(data.resources || { free: [], paid: [] });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [skillName]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Learn "{skillName}"</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && <div className="p-6 text-gray-500">Loading resources...</div>}

        {error && <div className="p-6 text-red-600">Error: {error}</div>}

        {!loading && !error && (
          <div className="p-6 grid grid-cols-2 gap-6">
            {/* Free Resources */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Free</h4>
              {resources.free && resources.free.length > 0 ? (
                <ul className="space-y-2">
                  {resources.free.map((r, idx) => (
                    <li key={idx} className="text-sm">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {r.title}
                      </a>
                      <p className="text-xs text-gray-500">{r.platform}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No free resources</p>
              )}
            </div>

            {/* Paid Resources */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Paid</h4>
              {resources.paid && resources.paid.length > 0 ? (
                <ul className="space-y-2">
                  {resources.paid.map((r, idx) => (
                    <li key={idx} className="text-sm">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {r.title}
                      </a>
                      <p className="text-xs text-gray-500">{r.platform}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No paid resources</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
