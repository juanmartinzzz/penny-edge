'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/interaction/Button';
import Input from '@/components/interaction/Input';
import Textarea from '@/components/interaction/Textarea';
import PillList from '@/components/interaction/PillList';
import { Plus, Edit, Trash2, Calendar, CheckCircle, Clock, AlertCircle, Snowflake } from 'lucide-react';

// Types
export type FeatureStatus = 'frozen' | 'to do' | 'in progress' | 'done';

export interface FutureFeature {
  id: string;
  name: string;
  requirements: string;
  implementationSteps: string;
  status: FeatureStatus;
  releaseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'future-features';

// Status configuration
const STATUS_OPTIONS: FeatureStatus[] = ['frozen', 'to do', 'in progress', 'done'];

const STATUS_CONFIG = {
  frozen: {
    label: 'Frozen',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Snowflake
  },
  'to do': {
    label: 'To Do',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Clock
  },
  'in progress': {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: AlertCircle
  },
  done: {
    label: 'Done',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  }
};

export default function FutureFeaturesManager() {
  const [features, setFeatures] = useState<FutureFeature[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FutureFeature | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<FeatureStatus[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    requirements: '',
    implementationSteps: '',
    status: 'to do' as FeatureStatus,
    releaseDate: ''
  });

  // Load features from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsedFeatures = JSON.parse(stored);
        setFeatures(parsedFeatures);
      } catch (error) {
        console.error('Error parsing stored features:', error);
      }
    }
  }, []);

  // Save features to localStorage whenever features change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
  }, [features]);

  // Filter features based on selected statuses
  const filteredFeatures = selectedStatuses.length === 0
    ? features
    : features.filter(feature => selectedStatuses.includes(feature.status));

  // Sort features by status priority and creation date
  const sortedFeatures = [...filteredFeatures].sort((a, b) => {
    const statusOrder = ['to do', 'in progress', 'frozen', 'done'];
    const aIndex = statusOrder.indexOf(a.status);
    const bIndex = statusOrder.indexOf(b.status);

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    // Within same status, sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const resetForm = () => {
    setFormData({
      name: '',
      requirements: '',
      implementationSteps: '',
      status: 'to do',
      releaseDate: ''
    });
  };

  const handleAddFeature = () => {
    setIsEditing(true);
    setEditingFeature(null);
    resetForm();
  };

  const handleEditFeature = (feature: FutureFeature) => {
    setIsEditing(true);
    setEditingFeature(feature);
    setFormData({
      name: feature.name,
      requirements: feature.requirements,
      implementationSteps: feature.implementationSteps,
      status: feature.status,
      releaseDate: feature.releaseDate || ''
    });
  };

  const handleDeleteFeature = (featureId: string) => {
    if (confirm('Are you sure you want to delete this feature?')) {
      setFeatures(prev => prev.filter(f => f.id !== featureId));
    }
  };

  const handleSaveFeature = () => {
    if (!formData.name.trim()) {
      alert('Feature name is required');
      return;
    }

    const now = new Date().toISOString();
    const releaseDate = formData.releaseDate.trim() || null;

    if (editingFeature) {
      // Update existing feature
      setFeatures(prev => prev.map(feature =>
        feature.id === editingFeature.id
          ? {
              ...feature,
              ...formData,
              releaseDate,
              updatedAt: now
            }
          : feature
      ));
    } else {
      // Add new feature
      const newFeature: FutureFeature = {
        id: crypto.randomUUID(),
        ...formData,
        releaseDate,
        createdAt: now,
        updatedAt: now
      };
      setFeatures(prev => [...prev, newFeature]);
    }

    setIsEditing(false);
    setEditingFeature(null);
    resetForm();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingFeature(null);
    resetForm();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Features ({features.length})
          </h2>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleAddFeature}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Feature</span>
        </Button>
      </div>

      {/* Status Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Status</h3>
        <PillList
          options={STATUS_OPTIONS}
          selected={selectedStatuses}
          onChange={(selected) => setSelectedStatuses(selected as FeatureStatus[])}
          variant="multiple"
        />
        {selectedStatuses.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setSelectedStatuses([])}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingFeature ? 'Edit Feature' : 'Add New Feature'}
          </h3>

          <div className="space-y-4">
            <Input
              label="Feature Name"
              placeholder="Enter feature name"
              value={formData.name}
              onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="Requirements"
                placeholder="Describe the requirements for this feature"
                value={formData.requirements}
                onChange={(value) => setFormData(prev => ({ ...prev, requirements: value }))}
                rows={4}
              />

              <Textarea
                label="Implementation Steps"
                placeholder="Outline the steps needed to implement this feature"
                value={formData.implementationSteps}
                onChange={(value) => setFormData(prev => ({ ...prev, implementationSteps: value }))}
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <PillList
                options={STATUS_OPTIONS}
                selected={[formData.status]}
                onChange={(selected) => setFormData(prev => ({ ...prev, status: selected[0] as FeatureStatus }))}
                variant="single"
              />
            </div>

            <Input
              label="Release Date"
              type="date"
              value={formData.releaseDate}
              onChange={(value) => setFormData(prev => ({ ...prev, releaseDate: value }))}
            />
          </div>

          <div className="flex space-x-3 mt-6">
            <Button variant="primary" onClick={handleSaveFeature}>
              {editingFeature ? 'Update Feature' : 'Add Feature'}
            </Button>
            <Button variant="secondary" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Features List */}
      <div className="space-y-4">
        {sortedFeatures.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">
              {features.length === 0
                ? "No features added yet. Click 'Add Feature' to get started."
                : "No features match your current filters."
              }
            </p>
          </div>
        ) : (
          sortedFeatures.map((feature) => {
            const statusConfig = STATUS_CONFIG[feature.status];
            const StatusIcon = statusConfig.icon;

            return (
              <div key={feature.id} className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.name}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </div>
                      {feature.releaseDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(feature.releaseDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditFeature(feature)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFeature(feature.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feature.requirements && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Requirements</h5>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{feature.requirements}</p>
                    </div>
                  )}

                  {feature.implementationSteps && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Implementation Steps</h5>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{feature.implementationSteps}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}