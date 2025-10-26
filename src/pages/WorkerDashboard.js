import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../database/db';
import { aiAssistant } from '../services/aiAssistant';
import { 
  Heart, X, MessageSquare, Calendar, MapPin, DollarSign, 
  Clock, Star, Briefcase, Video, Bell, BellDot, CheckCircle2,
  Send, ThumbsUp, Award, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

const WorkerDashboard = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  const [availableJobs, setAvailableJobs] = useState([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(checkForNewMatches, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;

    const allJobs = await db.jobs.where('status').equals('active').toArray();
    
    const enrichedJobs = await Promise.all(
      allJobs.map(async (job) => {
        const employer = await db.users.get(job.employerId);
        const matchScore = aiAssistant.calculateMatchScore(currentUser, job);
        return { ...job, employer, matchScore };
      })
    );

    const appliedJobIds = (await db.matches
      .where('workerId')
      .equals(currentUser.id)
      .toArray()).map(m => m.jobId);

    const availableJobsFiltered = enrichedJobs
      .filter(job => !appliedJobIds.includes(job.id))
      .sort((a, b) => b.matchScore - a.matchScore);
    
    setAvailableJobs(availableJobsFiltered);

    const userMatches = await db.matches
      .where('workerId')
      .equals(currentUser.id)
      .toArray();

    const enrichedMatches = await Promise.all(
      userMatches.map(async (match) => {
        const job = await db.jobs.get(match.jobId);
        const employer = await db.users.get(job?.employerId);
        
        const messages = await db.messages.where('matchId').equals(match.id).toArray();
        const unreadMessages = messages.filter(m => 
          m.senderId !== currentUser.id && 
          m.senderId !== 'ai' &&
          !m.read
        ).length;

        return { ...match, job, employer, unreadMessages };
      })
    );
    setMatches(enrichedMatches);

    const matchIds = userMatches.map(m => m.id);
    const allInterviews = await db.interviews.toArray();
    const userInterviews = allInterviews.filter(i => matchIds.includes(i.matchId));
    
    const enrichedInterviews = await Promise.all(
      userInterviews.map(async (interview) => {
        const match = enrichedMatches.find(m => m.id === interview.matchId);
        return { ...interview, match };
      })
    );
    setInterviews(enrichedInterviews);

    loadNotifications();
  };

  const loadNotifications = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMatches = await db.matches
      .where('workerId')
      .equals(currentUser.id)
      .toArray();

    const notifs = await Promise.all(
      recentMatches
        .filter(m => new Date(m.createdAt) > sevenDaysAgo)
        .map(async (match) => {
          const job = await db.jobs.get(match.jobId);
          const employer = await db.users.get(job?.employerId);
          return {
            id: match.id,
            type: 'match',
            title: 'New Job Match!',
            message: `You matched with ${job?.title} at ${employer?.name}`,
            matchScore: match.matchScore,
            timestamp: match.createdAt,
            read: match.notificationRead || false
          };
        })
    );

    setNotifications(notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  const checkForNewMatches = async () => {
    loadNotifications();
  };

  const markNotificationAsRead = async (notificationId) => {
    const match = await db.matches.get(notificationId);
    if (match) {
      await db.matches.update(notificationId, { notificationRead: true });
      loadNotifications();
    }
  };

  const markAllNotificationsAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const notif of unread) {
      await markNotificationAsRead(notif.id);
    }
  };

  const handleSwipe = async (job, interested) => {
    if (interested) {
      const matchId = await db.matches.add({
        jobId: job.id,
        workerId: currentUser.id,
        status: 'accepted',
        matchScore: job.matchScore,
        createdAt: new Date(),
        notificationRead: false
      });

      const { message } = aiAssistant.generateOutreachMessage(currentUser, job, language);
      await db.messages.add({
        matchId,
        senderId: 'ai',
        message,
        timestamp: new Date()
      });

      loadData();
    }

    setCurrentJobIndex(currentJobIndex + 1);
  };

  const openChat = async (match) => {
    setSelectedMatch(match);
    const messages = await db.messages
      .where('matchId')
      .equals(match.id)
      .toArray();
    
    for (const msg of messages) {
      if (msg.senderId !== currentUser.id && !msg.read) {
        await db.messages.update(msg.id, { read: true });
      }
    }
    
    setChatMessages(messages);
    loadData();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch) return;

    await db.messages.add({
      matchId: selectedMatch.id,
      senderId: currentUser.id,
      message: newMessage,
      timestamp: new Date(),
      read: false
    });

    const userMsg = {
      senderId: currentUser.id,
      message: newMessage,
      timestamp: new Date()
    };

    const aiResponse = aiAssistant.getResponse(
      newMessage,
      selectedMatch.job,
      language
    );

    await db.messages.add({
      matchId: selectedMatch.id,
      senderId: 'ai',
      message: aiResponse,
      timestamp: new Date(),
      read: false
    });

    const aiMsg = {
      senderId: 'ai',
      message: aiResponse,
      timestamp: new Date()
    };

    setChatMessages([...chatMessages, userMsg, aiMsg]);
    setNewMessage('');
  };

  const currentJob = availableJobs[currentJobIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentUser?.name}</h1>
                <p className="text-xs text-gray-600">Job Seeker</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  {unreadCount > 0 ? (
                    <BellDot className="w-6 h-6" />
                  ) : (
                    <Bell className="w-6 h-6" />
                  )}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              markNotificationAsRead(notif.id);
                              setShowNotifications(false);
                              setActiveTab('applied');
                            }}
                            className={`p-4 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition ${
                              !notif.read ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900">{notif.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                                <div className="flex items-center mt-2 space-x-2">
                                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                    <Star className="w-3 h-3 mr-1" />
                                    {notif.matchScore}% Match
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(notif.timestamp), 'MMM d, h:mm a')}
                                  </span>
                                </div>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>

              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'discover', label: 'Discover', icon: Briefcase },
              { id: 'applied', label: 'Applied', icon: CheckCircle2, badge: matches.length },
              { id: 'messages', label: 'Messages', icon: MessageSquare, badge: matches.reduce((sum, m) => sum + (m.unreadMessages || 0), 0) },
              { id: 'interviews', label: 'Interviews', icon: Calendar, badge: interviews.length },
              { id: 'reviews', label: 'Reviews', icon: Star }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 py-4 px-1 border-b-2 font-semibold text-sm transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'discover' && (
          <DiscoverTab
            currentJob={currentJob}
            availableJobs={availableJobs}
            currentJobIndex={currentJobIndex}
            handleSwipe={handleSwipe}
          />
        )}

        {activeTab === 'applied' && (
          <AppliedTab matches={matches} onMessage={openChat} />
        )}

        {activeTab === 'messages' && (
          <MessagesTab matches={matches} onOpenChat={openChat} />
        )}

        {activeTab === 'interviews' && (
          <InterviewsTab interviews={interviews} />
        )}

        {activeTab === 'reviews' && (
          <ReviewsTab currentUser={currentUser} />
        )}
      </main>

      {/* Chat Modal */}
      {selectedMatch && (
        <ChatModal
          match={selectedMatch}
          messages={chatMessages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSend={sendMessage}
          onClose={() => setSelectedMatch(null)}
          language={language}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

// Component definitions continue in next message due to length...
export default WorkerDashboard;

// Discover Tab Component (Tinder-style)
const DiscoverTab = ({ currentJob, availableJobs, currentJobIndex, handleSwipe }) => (
  <div className="flex justify-center">
    {currentJob ? (
      <div className="max-w-md w-full animate-fade-in">
        <JobCard job={currentJob} />
        <div className="flex justify-center space-x-8 mt-8">
          <button
            onClick={() => handleSwipe(currentJob, false)}
            className="w-16 h-16 bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center shadow-lg transition hover:scale-110"
            aria-label="Pass on job"
          >
            <X className="w-8 h-8" />
          </button>
          <button
            onClick={() => handleSwipe(currentJob, true)}
            className="w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition hover:scale-110"
            aria-label="Apply to job"
          >
            <Heart className="w-8 h-8 text-white" />
          </button>
        </div>
        <p className="text-center text-gray-600 mt-4 text-sm">
          {availableJobs.length - currentJobIndex} jobs remaining
        </p>
      </div>
    ) : (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-10 h-10 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          No More Jobs Available
        </h3>
        <p className="text-gray-600 mb-6">
          Check back later for new opportunities!
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Refresh Jobs
        </button>
      </div>
    )}
  </div>
);

// Job Card Component
const JobCard = ({ job }) => (
  <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">{job.title}</h2>
          <p className="text-blue-100">{job.employer?.name}</p>
        </div>
        <div className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
          <Star className="w-5 h-5 fill-current" />
          <span className="font-bold text-lg">{job.matchScore}%</span>
        </div>
      </div>
    </div>

    <div className="p-6 space-y-4">
      <div className="flex items-center text-gray-700">
        <MapPin className="w-5 h-5 mr-3 text-blue-600 flex-shrink-0" />
        <span>{job.location}</span>
      </div>
      
      <div className="flex items-center text-gray-700">
        <DollarSign className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" />
        <span className="font-semibold text-green-700">{job.pay}</span>
      </div>
      
      <div className="flex items-center text-gray-700">
        <Clock className="w-5 h-5 mr-3 text-blue-600 flex-shrink-0" />
        <span>{job.availability}</span>
      </div>

      {job.description && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-gray-700 text-sm leading-relaxed">{job.description}</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm font-semibold text-gray-700 mb-3">Skills Required:</p>
        <div className="flex flex-wrap gap-2">
          {job.skillsNeeded?.map((skill, idx) => (
            <span 
              key={idx} 
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Applied Tab Component
const AppliedTab = ({ matches, onMessage }) => (
  <div>
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Applied Jobs</h2>
      <p className="text-gray-600 mt-1">Track your job applications</p>
    </div>
    
    {matches.length === 0 ? (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Yet</h3>
        <p className="text-gray-600">Start swiping to apply for jobs!</p>
      </div>
    ) : (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {matches.map(match => (
          <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{match.job?.title}</h3>
                <p className="text-sm text-gray-600">{match.employer?.name}</p>
              </div>
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                <Star className="w-3 h-3 mr-1" />
                {match.matchScore}%
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                {match.job?.location}
              </div>
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                {match.job?.pay}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                Applied {format(new Date(match.createdAt), 'MMM d, yyyy')}
              </div>
            </div>

            <button
              onClick={() => onMessage(match)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>View Details</span>
              {match.unreadMessages > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {match.unreadMessages}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Messages Tab Component
const MessagesTab = ({ matches, onOpenChat }) => {
  const matchesWithMessages = matches.filter(m => m.unreadMessages > 0 || true);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
        <p className="text-gray-600 mt-1">Chat with employers</p>
      </div>

      {matchesWithMessages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Messages Yet</h3>
          <p className="text-gray-600">Apply to jobs to start chatting with employers</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
          {matchesWithMessages.map(match => (
            <div
              key={match.id}
              onClick={() => onOpenChat(match)}
              className="p-4 hover:bg-blue-50 cursor-pointer transition flex items-center space-x-4"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{match.job?.title}</h3>
                  {match.unreadMessages > 0 && (
                    <span className="ml-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                      {match.unreadMessages}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">{match.employer?.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {match.matchScore}% match • Click to chat
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Interviews Tab Component
const InterviewsTab = ({ interviews }) => (
  <div>
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Interviews</h2>
      <p className="text-gray-600 mt-1">Manage your interview schedule</p>
    </div>

    {interviews.length === 0 ? (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Interviews Scheduled</h3>
        <p className="text-gray-600">Your scheduled interviews will appear here</p>
      </div>
    ) : (
      <div className="space-y-4">
        {interviews.map(interview => (
          <div key={interview.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {interview.match?.job?.title}
                </h3>
                <p className="text-gray-600 mb-4">{interview.match?.employer?.name}</p>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {interview.scheduledAt ? format(new Date(interview.scheduledAt), 'PPP p') : 'Not scheduled'}
                  </div>
                  <div className="flex items-center">
                    <Video className="w-4 h-4 mr-2" />
                    Video Interview
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                interview.status === 'completed' ? 'bg-green-100 text-green-700' :
                interview.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {interview.status}
              </span>
            </div>
            {interview.status === 'scheduled' && interview.meetingLink && (
              <div className="mt-4">
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 text-center font-semibold transition"
                >
                  Join Interview
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

// Reviews Tab Component
const ReviewsTab = ({ currentUser }) => (
  <div>
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h2>
      <p className="text-gray-600 mt-1">Your performance reviews from employers</p>
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      {/* Profile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Star className="w-8 h-8 text-white fill-current" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">4.8</p>
          <p className="text-sm text-gray-600">Average Rating</p>
        </div>
        
        <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <ThumbsUp className="w-8 h-8 text-white" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">12</p>
          <p className="text-sm text-gray-600">Positive Reviews</p>
        </div>
        
        <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200">
          <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Award className="w-8 h-8 text-white" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">5</p>
          <p className="text-sm text-gray-600">Completed Jobs</p>
        </div>
      </div>

      {/* Sample Reviews */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Reviews</h3>
        
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-start space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">ABC Construction Co.</p>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-500">2 weeks ago</span>
              </div>
              <p className="text-sm text-gray-700">
                "Excellent work! Very professional and completed the job on time. Would definitely hire again."
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-start space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">XYZ Plumbing Services</p>
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4].map((star) => (
                      <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                    <Star className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
                <span className="text-xs text-gray-500">1 month ago</span>
              </div>
              <p className="text-sm text-gray-700">
                "Great skills and attention to detail. Communication could be better but overall solid performance."
              </p>
            </div>
          </div>
        </div>

        <div className="text-center pt-6">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
            View All Reviews
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Chat Modal Component
const ChatModal = ({ match, messages, newMessage, setNewMessage, onSend, onClose, language, currentUser }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-blue-50">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{match.job?.title}</h3>
          <p className="text-sm text-gray-600">{match.employer?.name}</p>
        </div>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-2 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.senderId === 'ai' ? 'justify-start' : msg.senderId === match.employerId ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[75%] rounded-xl px-4 py-3 shadow-sm ${
              msg.senderId === 'ai' ? 'bg-yellow-50 text-gray-900 border border-yellow-200' :
              msg.senderId === match.employerId ? 'bg-white text-gray-900 border border-gray-200' :
              'bg-blue-600 text-white'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
              <p className={`text-xs mt-2 ${
                msg.senderId === currentUser.id ? 'text-blue-200' : 'text-gray-500'
              }`}>
                {format(new Date(msg.timestamp), 'p')}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSend()}
            placeholder={language === 'es' ? 'Escribe un mensaje...' : 'Type a message...'}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button 
            onClick={onSend} 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'es' ? 'Enviar' : 'Send'}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);