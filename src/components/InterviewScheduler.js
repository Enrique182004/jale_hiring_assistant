import React, { useState } from 'react';
import { Calendar, Clock, Video, AlertCircle } from 'lucide-react';
import { db, generateJitsiRoomName } from '../database/db';

const InterviewScheduler = ({ match, currentUser, onScheduleSuccess }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const handleSchedule = async (e) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      alert('Please select both date and time');
      return;
    }

    setScheduling(true);

    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);

      // Check if date is in the past
      if (scheduledDateTime < new Date()) {
        alert('Cannot schedule interviews in the past');
        setScheduling(false);
        return;
      }

      // Generate unique Jitsi room name
      const roomName = generateJitsiRoomName(match.id);

      // Create interview
      const interviewId = await db.interviews.add({
        matchId: match.id,
        scheduledAt: scheduledDateTime,
        duration: parseInt(duration),
        notes,
        status: 'scheduled',
        jitsiRoomName: roomName,
        createdAt: new Date()
      });

      // Send notification to both parties
      const isEmployer = currentUser.userType === 'employer';
      const otherUserId = isEmployer ? match.workerId : match.employerId;
      const otherUser = await db.users.get(otherUserId);

      await db.messages.add({
        matchId: match.id,
        senderId: 'system',
        message: `Interview scheduled for ${scheduledDateTime.toLocaleString()}. Join link: https://meet.jit.si/${roomName}`,
        messageType: 'interview_scheduled',
        interviewId,
        timestamp: new Date()
      });

      // Create reminders
      await createReminders(interviewId, scheduledDateTime, otherUser);

      alert('Interview scheduled successfully!');

      if (onScheduleSuccess) {
        onScheduleSuccess(interviewId);
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Error scheduling interview. Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  const createReminders = async (interviewId, dateTime, otherUser) => {
    // In a real app, this would integrate with a notification service
    // For now, we'll store reminder times in localStorage
    
    const reminderTimes = {
      '24h': new Date(dateTime.getTime() - 24 * 60 * 60 * 1000),
      '1h': new Date(dateTime.getTime() - 60 * 60 * 1000),
      '15m': new Date(dateTime.getTime() - 15 * 60 * 1000)
    };

    localStorage.setItem(
      `interview_reminders_${interviewId}`,
      JSON.stringify(reminderTimes)
    );
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMinTime = () => {
    if (selectedDate === new Date().toISOString().split('T')[0]) {
      const now = new Date();
      return now.toTimeString().slice(0, 5);
    }
    return '08:00';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Video className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Schedule Video Interview
        </h2>
        <p className="text-gray-600 text-center">
          Job: <span className="font-semibold">{match.job?.title}</span>
        </p>
      </div>

      <form onSubmit={handleSchedule} className="space-y-6">
        {/* Date Selection */}
        <div>
          <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Select Date *</span>
            </div>
          </label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={getMinDate()}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Time Selection */}
        <div>
          <label htmlFor="time" className="block text-sm font-semibold text-gray-700 mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Select Time *</span>
            </div>
          </label>
          <input
            type="time"
            id="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            min={getMinTime()}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="duration" className="block text-sm font-semibold text-gray-700 mb-2">
            Interview Duration
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
            Interview Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add any specific topics to discuss or preparation notes..."
          />
        </div>

        {/* Reminder Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Automatic Reminders</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>24 hours before the interview</li>
                <li>1 hour before the interview</li>
                <li>15 minutes before the interview</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview */}
        {selectedDate && selectedTime && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Interview Summary:</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>📅 {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p>⏰ {new Date(`${selectedDate}T${selectedTime}`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}</p>
              <p>⏱️ Duration: {duration} minutes</p>
              <p>🎥 Platform: Jitsi Meet (Video Conference)</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={scheduling}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
        >
          {scheduling ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Scheduling...</span>
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              <span>Schedule Interview</span>
            </>
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <p className="text-xs text-gray-600 text-center">
          Both parties will receive the interview link and can join directly from the app
        </p>
      </div>
    </div>
  );
};

export default InterviewScheduler;