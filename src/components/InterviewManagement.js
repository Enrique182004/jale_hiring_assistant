import React, { useState, useEffect } from 'react';
import { 
  Video, Calendar, Clock, MapPin, Phone, X, Check, 
  AlertCircle, MessageSquare, Edit2, Trash2, ExternalLink,
  User, CheckCircle, XCircle
} from 'lucide-react';
import { db } from '../database/db';
import { format, isPast, isFuture, differenceInMinutes, addMinutes } from 'date-fns';
import JitsiMeetComponent from './JitsiMeet';

const InterviewManagement = ({ currentUser, onClose }) => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showJitsi, setShowJitsi] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadInterviews();
    const interval = setInterval(loadInterviews, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [currentUser, filter]);

  const loadInterviews = async () => {
    setLoading(true);
    try {
      // Get all matches for current user
      const userMatches = currentUser.userType === 'employer'
        ? await db.matches.where('employerId').equals(currentUser.id).toArray()
        : await db.matches.where('workerId').equals(currentUser.id).toArray();

      const matchIds = userMatches.map(m => m.id);

      // Get all interviews
      const allInterviews = await db.interviews.toArray();
      const userInterviews = allInterviews.filter(i => matchIds.includes(i.matchId));

      // Enrich with match and user data
      const enrichedInterviews = await Promise.all(
        userInterviews.map(async (interview) => {
          const match = await db.matches.get(interview.matchId);
          const job = await db.jobs.get(match.jobId);
          const otherUserId = currentUser.userType === 'employer' 
            ? match.workerId 
            : match.employerId;
          const otherUser = await db.users.get(otherUserId);

          return {
            ...interview,
            match,
            job,
            otherUser,
            scheduledDate: new Date(interview.scheduledAt),
            isPast: isPast(new Date(interview.scheduledAt)),
            isSoon: differenceInMinutes(new Date(interview.scheduledAt), new Date()) <= 30,
            canJoin: Math.abs(differenceInMinutes(new Date(interview.scheduledAt), new Date())) <= 15
          };
        })
      );

      // Filter based on selection
      let filteredInterviews = enrichedInterviews;
      if (filter === 'upcoming') {
        filteredInterviews = enrichedInterviews.filter(i => !i.isPast && i.status !== 'cancelled');
      } else if (filter === 'past') {
        filteredInterviews = enrichedInterviews.filter(i => i.isPast || i.status === 'completed');
      }

      // Sort by date
      filteredInterviews.sort((a, b) => 
        filter === 'past' 
          ? b.scheduledDate - a.scheduledDate 
          : a.scheduledDate - b.scheduledDate
      );

      setInterviews(filteredInterviews);
    } catch (error) {
      console.error('Error loading interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinInterview = (interview) => {
    setSelectedInterview(interview);
    setShowJitsi(true);
  };

  const handleCancelInterview = async () => {
    if (!selectedInterview || !cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    try {
      await db.interviews.update(selectedInterview.id, {
        status: 'cancelled',
        cancelledBy: currentUser.id,
        cancelledAt: new Date(),
        cancellationReason: cancelReason
      });

      // Send notification
      await db.notifications.add({
        userId: selectedInterview.otherUser.id,
        type: 'interview_cancelled',
        title: 'Interview Cancelled',
        message: `${currentUser.name} cancelled the interview scheduled for ${format(selectedInterview.scheduledDate, 'PPp')}`,
        read: false,
        timestamp: new Date()
      });

      // Send message
      await db.messages.add({
        matchId: selectedInterview.matchId,
        senderId: 'system',
        message: `Interview cancelled by ${currentUser.name}\nReason: ${cancelReason}`,
        messageType: 'interview_cancelled',
        timestamp: new Date()
      });

      setShowCancelModal(false);
      setCancelReason('');
      setSelectedInterview(null);
      loadInterviews();
    } catch (error) {
      console.error('Error cancelling interview:', error);
      alert('Error cancelling interview');
    }
  };

  const handleCompleteInterview = async (interview) => {
    try {
      await db.interviews.update(interview.id, {
        status: 'completed',
        completedAt: new Date()
      });

      // Update match status
      await db.matches.update(interview.matchId, {
        status: 'interviewed',
        lastActivity: new Date()
      });

      loadInterviews();
    } catch (error) {
      console.error('Error completing interview:', error);
    }
  };

  const getStatusBadge = (interview) => {
    if (interview.status === 'cancelled') {
      return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Cancelled</span>;
    }
    if (interview.status === 'completed') {
      return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Completed</span>;
    }
    if (interview.isPast) {
      return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">Missed</span>;
    }
    if (interview.isSoon) {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full animate-pulse">Starting Soon</span>;
    }
    return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Scheduled</span>;
  };

  const getInterviewTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5 text-blue-600" />;
      case 'phone':
        return <Phone className="w-5 h-5 text-green-600" />;
      case 'in-person':
        return <MapPin className="w-5 h-5 text-purple-600" />;
      default:
        return <Video className="w-5 h-5 text-blue-600" />;
    }
  };

  if (showJitsi && selectedInterview) {
    return (
      <JitsiMeetComponent
        roomName={selectedInterview.jitsiRoomName}
        displayName={currentUser.name}
        onClose={() => {
          setShowJitsi(false);
          handleCompleteInterview(selectedInterview);
        }}
        onMeetingEnd={() => {
          setShowJitsi(false);
          handleCompleteInterview(selectedInterview);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">My Interviews</h2>
              <p className="text-blue-100">Manage your scheduled interviews</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2 mt-6">
            {[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
              { value: 'all', label: 'All' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === tab.value
                    ? 'bg-white text-blue-600'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No {filter !== 'all' && filter} interviews
              </h3>
              <p className="text-gray-600">
                {filter === 'upcoming' 
                  ? "You don't have any upcoming interviews scheduled"
                  : "No interviews found"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className={`bg-white rounded-xl border-2 p-6 transition ${
                    interview.isSoon && interview.status !== 'cancelled'
                      ? 'border-yellow-400 shadow-lg'
                      : interview.status === 'cancelled'
                      ? 'border-gray-300 opacity-60'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {interview.otherUser?.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {interview.job?.title}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          {getInterviewTypeIcon(interview.interviewType)}
                          <span className="text-sm text-gray-700 capitalize">
                            {interview.interviewType?.replace('-', ' ')} Interview
                          </span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(interview)}
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Date</p>
                        <p className="text-gray-900">
                          {format(interview.scheduledDate, 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Time</p>
                        <p className="text-gray-900">
                          {format(interview.scheduledDate, 'h:mm a')} ({interview.duration} min)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Type-specific details */}
                  {interview.interviewType === 'phone' && interview.phoneNumber && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-green-800 mb-1">Phone Number</p>
                      <p className="text-green-900">{interview.phoneNumber}</p>
                    </div>
                  )}

                  {interview.interviewType === 'in-person' && interview.location && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-purple-800 mb-1">Location</p>
                      <p className="text-purple-900 whitespace-pre-wrap">{interview.location}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {interview.notes && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Notes</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{interview.notes}</p>
                    </div>
                  )}

                  {/* Cancellation info */}
                  {interview.status === 'cancelled' && interview.cancellationReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-red-800 mb-1">Cancellation Reason</p>
                      <p className="text-sm text-red-700">{interview.cancellationReason}</p>
                      <p className="text-xs text-red-600 mt-1">
                        Cancelled {format(new Date(interview.cancelledAt), 'PPp')}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {interview.status !== 'cancelled' && !interview.isPast && (
                    <div className="flex flex-wrap gap-2">
                      {/* Join button for video interviews */}
                      {interview.interviewType === 'video' && interview.canJoin && (
                        <button
                          onClick={() => handleJoinInterview(interview)}
                          className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center space-x-2"
                        >
                          <Video className="w-5 h-5" />
                          <span>Join Interview Now</span>
                        </button>
                      )}

                      {/* Meeting link for video interviews */}
                      {interview.interviewType === 'video' && !interview.canJoin && interview.meetingLink && (
                        <a
                          href={interview.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2"
                        >
                          <ExternalLink className="w-5 h-5" />
                          <span>Open Meeting Link</span>
                        </a>
                      )}

                      {/* Cancel button */}
                      <button
                        onClick={() => {
                          setSelectedInterview(interview);
                          setShowCancelModal(true);
                        }}
                        className="px-4 py-3 border border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition flex items-center space-x-2"
                      >
                        <XCircle className="w-5 h-5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}

                  {/* Complete button for past interviews */}
                  {interview.isPast && interview.status === 'scheduled' && (
                    <button
                      onClick={() => handleCompleteInterview(interview)}
                      className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 transition flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Mark as Completed</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && selectedInterview && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Interview</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel your interview with {selectedInterview.otherUser?.name}?
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Cancellation *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Please provide a brief reason..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelInterview}
                  disabled={!cancelReason.trim()}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Cancellation
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setSelectedInterview(null);
                  }}
                  className="flex-1 border border-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Keep Interview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewManagement;