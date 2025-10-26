import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../database/db';
import { aiAssistant } from '../services/aiAssistant';
import { 
  Plus, Briefcase, Users, Calendar, MessageSquare, MapPin, DollarSign, 
  Clock, Star, Video, CheckCircle, XCircle, Bell, BellDot, Search,
  Filter, TrendingUp, Image as ImageIcon, BarChart3, CreditCard, X
} from 'lucide-react';
import { format } from 'date-fns';
import { ImageUploader, QuotesList, InterviewScheduler } from '../components';

const EmployerDashboard = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchFilters, setSearchFilters] = useState({
    skills: '',
    location: '',
    minRating: 0
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;

    // Load jobs
    const userJobs = await db.jobs
      .where('employerId')
      .equals(currentUser.id)
      .toArray();
    setJobs(userJobs);

    // Load matches
    const jobIds = userJobs.map(j => j.id);
    const allMatches = await db.matches.toArray();
    const relevantMatches = allMatches.filter(m => jobIds.includes(m.jobId));
    
    const enrichedMatches = await Promise.all(
      relevantMatches.map(async (match) => {
        const worker = await db.users.get(match.workerId);
        const job = await db.jobs.get(match.jobId);
        return { ...match, worker, job };
      })
    );
    setMatches(enrichedMatches);

    // Load interviews
    const matchIds = relevantMatches.map(m => m.id);
    const allInterviews = await db.interviews.toArray();
    const relevantInterviews = allInterviews.filter(i => matchIds.includes(i.matchId));
    
    const enrichedInterviews = await Promise.all(
      relevantInterviews.map(async (interview) => {
        const match = enrichedMatches.find(m => m.id === interview.matchId);
        return { ...interview, match };
      })
    );
    setInterviews(enrichedInterviews);

    // Load quotes
    const allQuotes = await db.quotes.toArray();
    const relevantQuotes = allQuotes.filter(q => jobIds.includes(q.jobId));
    setQuotes(relevantQuotes);

    // Load workers
    const allWorkers = await db.users.where('userType').equals('worker').toArray();
    const enrichedWorkers = await Promise.all(
      allWorkers.map(async (worker) => {
        const reviews = await db.reviews
          .where('revieweeId')
          .equals(worker.id)
          .toArray();
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;
        return { ...worker, avgRating, reviewCount: reviews.length };
      })
    );
    setWorkers(enrichedWorkers);

    loadNotifications();
  };

  const loadNotifications = async () => {
    if (!currentUser) return;

    const userJobs = await db.jobs
      .where('employerId')
      .equals(currentUser.id)
      .toArray();
    const jobIds = userJobs.map(j => j.id);

    // New quotes
    const recentQuotes = await db.quotes
      .where('jobId')
      .anyOf(jobIds)
      .and(q => q.status === 'pending')
      .toArray();

    const notifs = await Promise.all(
      recentQuotes.map(async (quote) => {
        const worker = await db.users.get(quote.workerId);
        const job = await db.jobs.get(quote.jobId);
        return {
          id: `quote-${quote.id}`,
          type: 'new_quote',
          title: 'New Quote Received',
          message: `${worker?.name} submitted a quote for ${job?.title}`,
          amount: quote.amount,
          timestamp: quote.createdAt,
          read: false
        };
      })
    );

    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  const createJob = async (jobData) => {
    const jobId = await db.jobs.add({
      ...jobData,
      employerId: currentUser.id,
      status: 'active',
      createdAt: new Date()
    });

    // Find potential matches
    const workers = await db.users.where('userType').equals('worker').toArray();
    const job = await db.jobs.get(jobId);
    
    for (const worker of workers) {
      const matchScore = aiAssistant.calculateMatchScore(worker, job);
      
      if (matchScore >= 60) {
        await db.matches.add({
          jobId,
          workerId: worker.id,
          status: 'pending',
          matchScore,
          createdAt: new Date()
        });
      }
    }

    loadData();
    setShowJobForm(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch) return;

    await db.messages.add({
      matchId: selectedMatch.id,
      senderId: currentUser.id,
      message: newMessage,
      timestamp: new Date()
    });

    setChatMessages([...chatMessages, {
      senderId: currentUser.id,
      message: newMessage,
      timestamp: new Date()
    }]);

    setNewMessage('');
  };

  const openChat = async (match) => {
    setSelectedMatch(match);
    const messages = await db.messages
      .where('matchId')
      .equals(match.id)
      .toArray();
    setChatMessages(messages);
  };

  const filteredWorkers = workers.filter(w => {
    if (searchFilters.skills) {
      const hasSkill = w.skillsOffered?.some(skill => 
        skill.toLowerCase().includes(searchFilters.skills.toLowerCase())
      );
      if (!hasSkill) return false;
    }
    if (searchFilters.location) {
      if (!w.location?.toLowerCase().includes(searchFilters.location.toLowerCase())) {
        return false;
      }
    }
    if (searchFilters.minRating > 0) {
      if (w.avgRating < searchFilters.minRating) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentUser?.name}</h1>
              <p className="text-sm text-gray-600">Employer Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              {unreadCount > 0 ? (
                <BellDot className="w-6 h-6 text-blue-600" />
              ) : (
                <Bell className="w-6 h-6" />
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div className="absolute right-4 top-16 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Notifications</h3>
              <button onClick={() => setShowNotifications(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No new notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                    <p className="font-semibold text-sm text-gray-900">{notif.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    {notif.amount && (
                      <p className="text-sm font-bold text-blue-600 mt-1">${notif.amount.toFixed(2)}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(notif.timestamp), 'PPp')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'jobs', label: 'My Jobs', icon: Briefcase },
              { id: 'quotes', label: 'Quotes', icon: DollarSign },
              { id: 'workers', label: 'Find Workers', icon: Users },
              { id: 'matches', label: 'Candidates', icon: CheckCircle },
              { id: 'interviews', label: 'Interviews', icon: Calendar }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <OverviewTab 
            jobs={jobs}
            quotes={quotes}
            interviews={interviews}
            matches={matches}
          />
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Job Posts</h2>
              <button
                onClick={() => setShowJobForm(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                <span>Post New Job</span>
              </button>
            </div>

            {showJobForm && (
              <JobForm 
                onSubmit={createJob} 
                onCancel={() => setShowJobForm(false)} 
                currentUser={currentUser} 
              />
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map(job => (
                <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
              ))}
            </div>
          </div>
        )}

        {/* Quotes Tab */}
        {activeTab === 'quotes' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quote Management</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Job
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSelectedJob(jobs.find(j => j.id === parseInt(e.target.value)))}
              >
                <option value="">Choose a job...</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>

            {selectedJob ? (
              <QuotesList 
                jobId={selectedJob.id}
                onAcceptQuote={loadData}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Select a job to view quotes</p>
              </div>
            )}
          </div>
        )}

        {/* Workers Tab */}
        {activeTab === 'workers' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Workers</h2>
            
            {/* Search Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Search className="w-4 h-4 inline mr-1" />
                    Skills
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Plumbing, Electrical"
                    value={searchFilters.skills}
                    onChange={(e) => setSearchFilters({...searchFilters, skills: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={searchFilters.location}
                    onChange={(e) => setSearchFilters({...searchFilters, location: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Star className="w-4 h-4 inline mr-1" />
                    Min Rating
                  </label>
                  <select
                    value={searchFilters.minRating}
                    onChange={(e) => setSearchFilters({...searchFilters, minRating: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">Any Rating</option>
                    <option value="3">3+ Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="4.5">4.5+ Stars</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Worker Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredWorkers.map(worker => (
                <WorkerCard key={worker.id} worker={worker} jobs={jobs} />
              ))}
            </div>

            {filteredWorkers.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No workers found matching your criteria</p>
              </div>
            )}
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Matched Candidates</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {matches.map(match => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  onMessage={() => openChat(match)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Interviews Tab */}
        {activeTab === 'interviews' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Scheduled Interviews</h2>
            <div className="space-y-4">
              {interviews.map(interview => (
                <InterviewCard key={interview.id} interview={interview} />
              ))}
            </div>
          </div>
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
        />
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ jobs, quotes, interviews, matches }) => {
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const pendingQuotes = quotes.filter(q => q.status === 'pending').length;
  const upcomingInterviews = interviews.filter(i => i.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Active Jobs"
          value={activeJobs}
          icon={Briefcase}
          color="blue"
        />
        <StatCard
          title="Pending Quotes"
          value={pendingQuotes}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Candidates"
          value={matches.length}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Interviews"
          value={upcomingInterviews}
          icon={Calendar}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition">
            <Plus className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-semibold text-gray-900">Post New Job</p>
          </button>
          <button className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition">
            <Users className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-semibold text-gray-900">Find Workers</p>
          </button>
          <button className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition">
            <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
            <p className="font-semibold text-gray-900">Review Quotes</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <ActivityItem
            icon={CheckCircle}
            text="New quote received for Plumbing Repair"
            time="2 hours ago"
            color="green"
          />
          <ActivityItem
            icon={Calendar}
            text="Interview scheduled with John Martinez"
            time="5 hours ago"
            color="blue"
          />
          <ActivityItem
            icon={Users}
            text="3 new candidates matched"
            time="1 day ago"
            color="purple"
          />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

const ActivityItem = ({ icon: Icon, text, time, color }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600'
  };

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
      <Icon className={`w-5 h-5 ${colorClasses[color]} mt-0.5`} />
      <div className="flex-1">
        <p className="text-sm text-gray-900">{text}</p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  );
};

// Job Form Component
const JobForm = ({ onSubmit, onCancel, currentUser }) => {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    pay: '',
    availability: '',
    description: ''
  });
  const [skills, setSkills] = useState('');
  const [tempJobId, setTempJobId] = useState(`temp-${Date.now()}`);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
    
    const jobId = await onSubmit({
      ...formData,
      skillsNeeded: skillsArray
    });

    // Update temp images with real job ID
    if (jobId) {
      await db.jobImages
        .where({ jobId: tempJobId })
        .modify({ jobId: jobId });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-200">
      <h3 className="text-2xl font-bold mb-6">Post a New Job</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          placeholder="Job Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Skills Needed (comma-separated)"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Pay Rate"
            value={formData.pay}
            onChange={(e) => setFormData({ ...formData, pay: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Availability"
            value={formData.availability}
            onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <textarea
          placeholder="Job Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows="4"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />

        {/* Image Upload Section */}
        <div className="border-t border-gray-200 pt-6">
          <ImageUploader
            jobId={tempJobId}
            userId={currentUser.id}
            imageType="initial"
            title="Upload Job Photos"
            description="Add photos showing the work area, damage, or requirements"
            maxImages={10}
          />
        </div>

        <div className="flex space-x-3">
          <button 
            type="submit" 
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Post Job
          </button>
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// Job Card Component
const JobCard = ({ job, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition cursor-pointer"
  >
    <h3 className="text-xl font-bold text-gray-900 mb-3">{job.title}</h3>
    <div className="space-y-2 text-sm text-gray-600 mb-4">
      <div className="flex items-center">
        <MapPin className="w-4 h-4 mr-2" />
        {job.location}
      </div>
      <div className="flex items-center">
        <DollarSign className="w-4 h-4 mr-2" />
        {job.pay}
      </div>
      <div className="flex items-center">
        <Clock className="w-4 h-4 mr-2" />
        {job.availability}
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {job.skillsNeeded?.map((skill, idx) => (
        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
          {skill}
        </span>
      ))}
    </div>
  </div>
);

// Worker Card Component
const WorkerCard = ({ worker, jobs }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{worker.name}</h3>
            <div className="flex items-center space-x-1 mt-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-semibold">
                {worker.avgRating > 0 ? worker.avgRating.toFixed(1) : 'New'}
              </span>
              {worker.reviewCount > 0 && (
                <span className="text-xs text-gray-500">({worker.reviewCount})</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center">
          <MapPin className="w-4 h-4 mr-2" />
          {worker.location}
        </div>
        <div className="flex items-center">
          <DollarSign className="w-4 h-4 mr-2" />
          {worker.pay}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Skills:</p>
        <div className="flex flex-wrap gap-2">
          {worker.skillsOffered?.map((skill, idx) => (
            <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              {skill}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowInviteModal(true)}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold transition"
      >
        Send Job Invite
      </button>
    </div>
  );
};

// Match Card Component
const MatchCard = ({ match, onMessage }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-xl font-bold text-gray-900">{match.worker?.name}</h3>
      <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm">
        <Star className="w-4 h-4" />
        <span>{match.matchScore}%</span>
      </div>
    </div>
    <p className="text-sm text-gray-600 mb-4">Job: {match.job?.title}</p>
    <div className="space-y-2 text-sm text-gray-600 mb-4">
      <div className="flex items-center">
        <MapPin className="w-4 h-4 mr-2" />
        {match.worker?.location}
      </div>
      <div className="flex items-center">
        <DollarSign className="w-4 h-4 mr-2" />
        {match.worker?.pay}
      </div>
    </div>
    <div className="mb-4">
      <p className="text-xs text-gray-500 mb-2">Skills:</p>
      <div className="flex flex-wrap gap-2">
        {match.worker?.skillsOffered?.map((skill, idx) => (
          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            {skill}
          </span>
        ))}
      </div>
    </div>
    <button
      onClick={onMessage}
      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
    >
      <MessageSquare className="w-4 h-4" />
      <span>Message</span>
    </button>
  </div>
);

// Interview Card Component
const InterviewCard = ({ interview }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {interview.match?.worker?.name}
        </h3>
        <p className="text-gray-600 mb-4">{interview.match?.job?.title}</p>
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
  </div>
);

// Chat Modal Component
const ChatModal = ({ match, messages, newMessage, setNewMessage, onSend, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
      <div className="p-4 border-b flex justify-between items-center bg-blue-50">
        <div>
          <h3 className="text-lg font-bold">{match.worker?.name}</h3>
          <p className="text-sm text-gray-600">{match.job?.title}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.senderId === 'ai' || msg.senderId !== match.workerId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-xl px-4 py-3 ${
              msg.senderId === 'ai' ? 'bg-yellow-50 border border-yellow-200' :
              msg.senderId === match.workerId ? 'bg-white border border-gray-200' :
              'bg-blue-600 text-white'
            }`}>
              <p className="text-sm">{msg.message}</p>
              <p className="text-xs mt-1 opacity-70">
                {format(new Date(msg.timestamp), 'p')}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={onSend} 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default EmployerDashboard;