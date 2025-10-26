import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Camera, Upload, MessageSquare, Clock } from 'lucide-react';
import { db, uploadImage } from '../database/db';
import { format } from 'date-fns';

const JobProgressTracker = ({ jobId, currentUser, isEmployer }) => {
  const [milestones, setMilestones] = useState([
    { id: 1, name: 'Job Started', status: 'pending', required: true },
    { id: 2, name: 'Materials Purchased', status: 'pending', required: false },
    { id: 3, name: '50% Complete', status: 'pending', required: true },
    { id: 4, name: 'Job Completed', status: 'pending', required: true },
    { id: 5, name: 'Final Inspection', status: 'pending', required: true }
  ]);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [progress, setProgress] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [jobId]);

  const loadProgress = async () => {
    const progressData = await db.jobProgress
      .where('jobId')
      .equals(jobId)
      .toArray();
    
    setProgress(progressData);
    
    // Update milestone statuses
    const updatedMilestones = milestones.map(milestone => {
      const milestoneProgress = progressData.find(p => p.milestoneId === milestone.id);
      if (milestoneProgress) {
        return {
          ...milestone,
          status: milestoneProgress.status,
          data: milestoneProgress
        };
      }
      return milestone;
    });
    setMilestones(updatedMilestones);
  };

  const handlePhotoUpload = async (e, milestoneId) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    const photoUrls = [];

    for (const file of files) {
      try {
        const imageId = await uploadImage(file, jobId, currentUser.id, 'progress');
        const image = await db.jobImages.get(imageId);
        photoUrls.push(image.imageUrl);
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }

    // Update or create progress entry
    const existingProgress = await db.jobProgress
      .where({ jobId, milestoneId })
      .first();

    if (existingProgress) {
      await db.jobProgress.update(existingProgress.id, {
        photos: [...(existingProgress.photos || []), ...photoUrls]
      });
    } else {
      await db.jobProgress.add({
        jobId,
        milestoneId,
        status: 'in_progress',
        photos: photoUrls,
        notes: '',
        completedDate: null,
        approvedBy: null,
        createdAt: new Date()
      });
    }

    setUploadingPhoto(false);
    loadProgress();
  };

  const completeMilestone = async (milestoneId, notes) => {
    const existingProgress = await db.jobProgress
      .where({ jobId, milestoneId })
      .first();

    if (existingProgress) {
      await db.jobProgress.update(existingProgress.id, {
        status: isEmployer ? 'completed' : 'pending_approval',
        notes,
        completedDate: new Date()
      });
    } else {
      await db.jobProgress.add({
        jobId,
        milestoneId,
        status: isEmployer ? 'completed' : 'pending_approval',
        photos: [],
        notes,
        completedDate: new Date(),
        createdAt: new Date()
      });
    }

    loadProgress();
  };

  const approveMilestone = async (milestoneId) => {
    const progressEntry = await db.jobProgress
      .where({ jobId, milestoneId })
      .first();

    if (progressEntry) {
      await db.jobProgress.update(progressEntry.id, {
        status: 'completed',
        approvedBy: currentUser.id,
        approvedDate: new Date()
      });
    }

    loadProgress();
  };

  const calculateProgress = () => {
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    return Math.round((completedMilestones / milestones.length) * 100);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Progress</h2>
        <p className="text-gray-600">Track milestones and documentation</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600">{calculateProgress()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {milestones.map((milestone, index) => {
          const milestoneData = progress.find(p => p.milestoneId === milestone.id);
          const isCompleted = milestone.status === 'completed';
          const isPending = milestone.status === 'pending_approval';
          const isInProgress = milestone.status === 'in_progress';

          return (
            <div key={milestone.id} className="relative">
              {/* Connection Line */}
              {index < milestones.length - 1 && (
                <div className={`absolute left-5 top-12 w-0.5 h-16 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}

              <div className="flex items-start space-x-4">
                {/* Status Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isCompleted ? 'bg-green-500' :
                  isPending ? 'bg-yellow-500' :
                  isInProgress ? 'bg-blue-500' :
                  'bg-gray-300'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <Circle className="w-6 h-6 text-white" />
                  )}
                </div>

                {/* Milestone Content */}
                <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{milestone.name}</h3>
                      {milestone.required && (
                        <span className="text-xs text-red-600 font-medium">Required</span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isCompleted ? 'bg-green-100 text-green-700' :
                      isPending ? 'bg-yellow-100 text-yellow-700' :
                      isInProgress ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {isCompleted ? 'Completed' :
                       isPending ? 'Pending Approval' :
                       isInProgress ? 'In Progress' :
                       'Pending'}
                    </span>
                  </div>

                  {/* Photos */}
                  {milestoneData?.photos && milestoneData.photos.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Photos:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {milestoneData.photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Milestone ${milestone.id} - Photo ${idx + 1}`}
                            className="w-full h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75"
                            onClick={() => window.open(photo, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {milestoneData?.notes && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Notes:</p>
                      <p className="text-sm text-gray-600">{milestoneData.notes}</p>
                    </div>
                  )}

                  {/* Completion Date */}
                  {milestoneData?.completedDate && (
                    <div className="flex items-center text-xs text-gray-500 mb-3">
                      <Clock className="w-3 h-3 mr-1" />
                      {format(new Date(milestoneData.completedDate), 'PPp')}
                    </div>
                  )}

                  {/* Actions */}
                  {!isCompleted && (
                    <div className="space-y-2">
                      {!isEmployer && (
                        <div className="flex space-x-2">
                          <label className="flex-1">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, milestone.id)}
                              className="hidden"
                            />
                            <div className="flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer">
                              <Camera className="w-4 h-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {uploadingPhoto ? 'Uploading...' : 'Add Photos'}
                              </span>
                            </div>
                          </label>
                          {(isInProgress || isPending) && (
                            <button
                              onClick={() => setSelectedMilestone(milestone)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      )}

                      {isEmployer && isPending && (
                        <button
                          onClick={() => approveMilestone(milestone.id)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
                        >
                          Approve Milestone
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Milestone Modal */}
      {selectedMilestone && (
        <CompleteMilestoneModal
          milestone={selectedMilestone}
          onComplete={(notes) => {
            completeMilestone(selectedMilestone.id, notes);
            setSelectedMilestone(null);
          }}
          onCancel={() => setSelectedMilestone(null)}
        />
      )}
    </div>
  );
};

const CompleteMilestoneModal = ({ milestone, onComplete, onCancel }) => {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Complete Milestone: {milestone.name}
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Add Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="4"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Describe what was completed, any issues encountered, etc."
          />
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => onComplete(notes)}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Complete Milestone
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobProgressTracker;