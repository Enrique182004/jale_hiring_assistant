import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../database/db';
import { aiAssistant } from '../services/aiAssistant';
import { 
  Heart, X, MessageSquare, Calendar, MapPin, DollarSign, 
  Clock, Star, Briefcase, Video, Bell, BellDot, CheckCircle2,
  Send, ThumbsUp, Award, TrendingUp, Filter, Search, Edit,
  Upload, Download, FileText, BarChart3, Target, Zap,
  Plus, Eye, Camera, Save, ChevronRight, AlertCircle,
  Building, Users, BookOpen, GraduationCap, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  NotificationPanel, 
  QuoteForm, 
  QuotesList,
  ReviewForm,
  JobProgressTracker,
  AnalyticsDashboard,
  InterviewScheduler,
  InterviewManagement
} from '../components';

const WorkerDashboard = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  const [activeSubTab, setActiveSubTab] = useState('matches');
  const [availableJobs, setAvailableJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterPay, setFilterPay] = useState('all');
  const [sortBy, setSortBy] = useState('match');
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [earnings, setEarnings] = useState({});
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(checkForNewMatches, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [availableJobs, searchTerm, filterLocation, filterPay, sortBy]);

  const loadData = async () => {
    if (!currentUser) return;

    // Load all available jobs
    const allJobs = await db.jobs.where('status').equals('active').toArray();
    
    const enrichedJobs = await Promise.all(
      allJobs.map(async (job) => {
        const employer = await db.users.get(job.employerId);
        const matchScore = aiAssistant.calculateMatchScore(currentUser, job);
        
        // Get existing quotes for this job
        const existingQuote = await db.quotes
          .where({ jobId: job.id, workerId: currentUser.id })
          .first();
        
        return { ...job, employer, matchScore, hasQuote: !!existingQuote };
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

    // Load matches
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

        // Get quote if exists
        const quote = await db.quotes
          .where({ jobId: job.id, workerId: currentUser.id })
          .first();

        return { ...match, job, employer, unreadMessages, quote };
      })
    );
    setMatches(enrichedMatches);

    // Separate active and completed jobs
    const active = enrichedMatches.filter(m => 
      ['accepted', 'quote_submitted', 'interview_scheduled', 'hired'].includes(m.status)
    );
    const completed = enrichedMatches.filter(m => m.status === 'completed');
    
    setActiveJobs(active);
    setCompletedJobs(completed);

    // Load interviews
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

    // Load reviews
    const userReviews = await db.reviews
      .where('revieweeId')
      .equals(currentUser.id)
      .toArray();
    
    const enrichedReviews = await Promise.all(
      userReviews.map(async (review) => {
        const reviewer = await db.users.get(review.reviewerId);
        const job = await db.jobs.get(review.jobId);
        return { ...review, reviewer, job };
      })
    );
    setReviews(enrichedReviews);

    // Load portfolio images
    const portfolioImages = await db.jobImages
      .where({ userId: currentUser.id, imageType: 'portfolio' })
      .toArray();
    setPortfolio(portfolioImages);

    // Calculate earnings
    const acceptedQuotes = await db.quotes
      .where('workerId')
      .equals(currentUser.id)
      .and(q => q.status === 'accepted')
      .toArray();
    
    const totalEarnings = acceptedQuotes.reduce((sum, q) => sum + q.amount, 0);
    const thisMonthEarnings = acceptedQuotes
      .filter(q => {
        const quoteDate = new Date(q.createdAt);
        const now = new Date();
        return quoteDate.getMonth() === now.getMonth() && 
               quoteDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, q) => sum + q.amount, 0);
    
    setEarnings({
      total: totalEarnings,
      thisMonth: thisMonthEarnings,
      quotesAccepted: acceptedQuotes.length,
      averagePerJob: acceptedQuotes.length > 0 ? totalEarnings / acceptedQuotes.length : 0
    });

    loadNotifications();
  };

  const applyFiltersAndSort = () => {
    let filtered = [...availableJobs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.skillsRequired?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Location filter
    if (filterLocation !== 'all') {
      filtered = filtered.filter(job => job.location?.includes(filterLocation));
    }

    // Pay filter
    if (filterPay !== 'all') {
      filtered = filtered.filter(job => {
        const payMatch = job.pay?.match(/\$(\d+)/);
        if (payMatch) {
          const pay = parseInt(payMatch[1]);
          if (filterPay === 'under25') return pay < 25;
          if (filterPay === '25to35') return pay >= 25 && pay < 35;
          if (filterPay === 'over35') return pay >= 35;
        }
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'match') return b.matchScore - a.matchScore;
      if (sortBy === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'pay') {
        const payA = parseInt(a.pay?.match(/\$(\d+)/)?.[1] || 0);
        const payB = parseInt(b.pay?.match(/\$(\d+)/)?.[1] || 0);
        return payB - payA;
      }
      return 0;
    });

    setFilteredJobs(filtered);
    setCurrentJobIndex(0);
  };

  const loadNotifications = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userNotifs = await db.notifications
      .where('userId')
      .equals(currentUser.id)
      .and(n => new Date(n.timestamp) > sevenDaysAgo)
      .toArray();

    setNotifications(userNotifs.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    ));
    setUnreadCount(userNotifs.filter(n => !n.read).length);
  };

  const checkForNewMatches = async () => {
    loadNotifications();
  };

  const markNotificationAsRead = async (notificationId) => {
    await db.notifications.update(notificationId, { read: true });
    loadNotifications();
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

      // Create notification
      await db.notifications.add({
        userId: currentUser.id,
        type: 'new_match',
        title: 'Job Match Created!',
        message: `You expressed interest in ${job.title}. The employer has been notified.`,
        read: false,
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

    setChatMessages([...chatMessages, {
      senderId: currentUser.id,
      message: newMessage,
      timestamp: new Date()
    }]);

    const userMsg = newMessage;
    setNewMessage('');
    
    // Get AI response with scheduling capability
    setTimeout(async () => {
      const aiResponse = await aiAssistant.getResponse(
        userMsg,
        selectedMatch.job,
        language,
        selectedMatch.id,
        currentUser
      );

      await db.messages.add({
        matchId: selectedMatch.id,
        senderId: 'ai',
        message: aiResponse,
        timestamp: new Date(),
        read: false
      });

      setChatMessages(prev => [...prev, {
        senderId: 'ai',
        message: aiResponse,
        timestamp: new Date()
      }]);

      // Reload data if interview was scheduled
      if (aiResponse.includes('scheduled') || aiResponse.includes('programada')) {
        setTimeout(() => {
          loadData();
        }, 1000);
      }
    }, 1000);
  };

  const currentJob = filteredJobs[currentJobIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Professional Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Jale
                </h1>
                <p className="text-xs text-gray-600">Worker Dashboard</p>
              </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="en">🇺🇸 English</option>
                <option value="es">🇪🇸 Español</option>
              </select>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition"
              >
                {unreadCount > 0 ? (
                  <BellDot className="w-6 h-6 text-blue-600" />
                ) : (
                  <Bell className="w-6 h-6 text-gray-600" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Profile */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
                  <div className="flex items-center justify-end">
                    <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                    <span className="text-xs text-gray-600">
                      {currentUser.averageRating?.toFixed(1) || 'New'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-700 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setShowNotifications(false)}
          onMarkAsRead={markNotificationAsRead}
        />
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={DollarSign}
            label="Total Earnings"
            value={`$${earnings.total?.toFixed(2) || '0.00'}`}
            color="green"
            subtitle={`$${earnings.thisMonth?.toFixed(0) || '0'} this month`}
          />
          <StatCard
            icon={Briefcase}
            label="Active Jobs"
            value={activeJobs.length}
            color="blue"
            subtitle={`${completedJobs.length} completed`}
          />
          <StatCard
            icon={Star}
            label="Rating"
            value={currentUser.averageRating?.toFixed(1) || 'New'}
            color="yellow"
            subtitle={`${currentUser.totalReviews || 0} reviews`}
          />
          <StatCard
            icon={Target}
            label="Success Rate"
            value={`${earnings.quotesAccepted > 0 ? ((earnings.quotesAccepted / (earnings.quotesAccepted + 2)) * 100).toFixed(0) : 0}%`}
            color="purple"
            subtitle={`${earnings.quotesAccepted || 0} quotes accepted`}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            <TabButton
              active={activeTab === 'discover'}
              onClick={() => setActiveTab('discover')}
              icon={Search}
              label="Discover Jobs"
              count={filteredJobs.length}
            />
            <TabButton
              active={activeTab === 'my-jobs'}
              onClick={() => setActiveTab('my-jobs')}
              icon={Briefcase}
              label="My Jobs"
              count={activeJobs.length}
              badge={matches.some(m => m.unreadMessages > 0)}
            />
            <TabButton
              active={activeTab === 'interviews'}
              onClick={() => setActiveTab('interviews')}
              icon={Video}
              label="Interviews"
              count={interviews.filter(i => i.status === 'scheduled').length}
            />
            <TabButton
              active={activeTab === 'portfolio'}
              onClick={() => setActiveTab('portfolio')}
              icon={Award}
              label="Portfolio"
            />
            <TabButton
              active={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              icon={BarChart3}
              label="Analytics"
            />
            <TabButton
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              icon={Users}
              label="Profile"
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'discover' && (
          <DiscoverTab
            currentJob={currentJob}
            filteredJobs={filteredJobs}
            currentJobIndex={currentJobIndex}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterLocation={filterLocation}
            setFilterLocation={setFilterLocation}
            filterPay={filterPay}
            setFilterPay={setFilterPay}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onSwipe={handleSwipe}
            onViewDetails={(job) => setSelectedJob(job)}
            language={language}
          />
        )}

        {activeTab === 'my-jobs' && (
          <MyJobsTab
            matches={matches}
            activeJobs={activeJobs}
            completedJobs={completedJobs}
            onOpenChat={openChat}
            currentUser={currentUser}
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
          />
        )}

        {activeTab === 'interviews' && (
          <InterviewsTab
            interviews={interviews}
            matches={matches}
            currentUser={currentUser}
            onReload={loadData}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioTab
            portfolio={portfolio}
            reviews={reviews}
            currentUser={currentUser}
            onReload={loadData}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard currentUser={currentUser} />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            currentUser={currentUser}
            onReload={loadData}
          />
        )}
      </div>

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

      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          currentUser={currentUser}
          onClose={() => setSelectedJob(null)}
          onApply={(job) => {
            handleSwipe(job, true);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
};

// Component: Stat Card
const StatCard = ({ icon: Icon, label, value, color, subtitle }) => {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-indigo-600',
    yellow: 'from-yellow-400 to-orange-500',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
};

// Component: Tab Button
const TabButton = ({ active, onClick, icon: Icon, label, count, badge }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center space-x-2 px-6 py-4 font-semibold transition border-b-2 ${
      active
        ? 'border-blue-600 text-blue-600 bg-blue-50'
        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="whitespace-nowrap">{label}</span>
    {count !== undefined && count > 0 && (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
      }`}>
        {count}
      </span>
    )}
    {badge && (
      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
    )}
  </button>
);

// Component: Discover Tab
const DiscoverTab = ({
  currentJob,
  filteredJobs,
  currentJobIndex,
  searchTerm,
  setSearchTerm,
  filterLocation,
  setFilterLocation,
  filterPay,
  setFilterPay,
  sortBy,
  setSortBy,
  onSwipe,
  onViewDetails,
  language
}) => (
  <div className="space-y-6">
    {/* Filters Bar */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search jobs, skills, or keywords..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Location Filter */}
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
        >
          <option value="all">All Locations</option>
          <option value="El Paso">El Paso, TX</option>
          <option value="Las Cruces">Las Cruces, NM</option>
          <option value="Albuquerque">Albuquerque, NM</option>
        </select>

        {/* Pay Filter */}
        <select
          value={filterPay}
          onChange={(e) => setFilterPay(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
        >
          <option value="all">All Pay Ranges</option>
          <option value="under25">Under $25/hr</option>
          <option value="25to35">$25-35/hr</option>
          <option value="over35">Over $35/hr</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
        >
          <option value="match">Best Match</option>
          <option value="date">Most Recent</option>
          <option value="pay">Highest Pay</option>
        </select>
      </div>

      {/* Results Count */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredJobs.length}</span> jobs
        </p>
        {(searchTerm || filterLocation !== 'all' || filterPay !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterLocation('all');
              setFilterPay('all');
            }}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>

    {/* Job Cards */}
    {currentJob ? (
      <div className="relative">
        <JobCard
          job={currentJob}
          onSwipe={onSwipe}
          onViewDetails={onViewDetails}
          language={language}
          remainingJobs={filteredJobs.length - currentJobIndex - 1}
        />
      </div>
    ) : (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {language === 'es' ? 'No hay más trabajos' : 'No more jobs'}
        </h3>
        <p className="text-gray-600 mb-6">
          {language === 'es'
            ? 'Has visto todos los trabajos disponibles. Vuelve más tarde para ver nuevas oportunidades.'
            : "You've viewed all available jobs. Check back later for new opportunities."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          {language === 'es' ? 'Recargar' : 'Reload'}
        </button>
      </div>
    )}
  </div>
);

// Component: Job Card
const JobCard = ({ job, onSwipe, onViewDetails, language, remainingJobs }) => {
  const matchPercentage = Math.round(job.matchScore);
  const matchColor =
    matchPercentage >= 90 ? 'text-green-600 bg-green-50' :
    matchPercentage >= 75 ? 'text-blue-600 bg-blue-50' :
    matchPercentage >= 60 ? 'text-yellow-600 bg-yellow-50' :
    'text-gray-600 bg-gray-50';

  return (
    <div className="relative">
      {/* Remaining Jobs Counter */}
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-gray-900 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
          {remainingJobs} more {remainingJobs === 1 ? 'job' : 'jobs'}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden hover:shadow-2xl transition-shadow">
        {/* Match Score Banner */}
        <div className={`${matchColor} px-6 py-3 flex items-center justify-between border-b border-gray-200`}>
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span className="font-bold text-lg">{matchPercentage}% Match</span>
          </div>
          {job.hasQuote && (
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Quote Submitted
            </span>
          )}
        </div>

        {/* Job Content */}
        <div className="p-6">
          {/* Employer Info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{job.title}</h3>
                <p className="text-gray-600 font-medium">{job.employer?.name}</p>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <DetailItem icon={MapPin} label="Location" value={job.location} />
            <DetailItem icon={DollarSign} label="Pay" value={job.pay} />
            <DetailItem icon={Clock} label="Duration" value={job.duration || 'Flexible'} />
            <DetailItem icon={Calendar} label="Start Date" value={format(new Date(job.startDate || new Date()), 'MMM d, yyyy')} />
          </div>

          {/* Description */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
            <p className="text-gray-700 leading-relaxed line-clamp-3">{job.description}</p>
          </div>

          {/* Skills Required */}
          {job.skillsRequired && job.skillsRequired.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Required Skills</h4>
              <div className="flex flex-wrap gap-2">
                {job.skillsRequired.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => onSwipe(job, false)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-bold transition flex items-center justify-center space-x-2 shadow-sm"
            >
              <X className="w-5 h-5" />
              <span>{language === 'es' ? 'Pasar' : 'Pass'}</span>
            </button>
            <button
              onClick={() => onViewDetails(job)}
              className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-4 rounded-xl font-bold transition flex items-center justify-center space-x-2 shadow-sm"
            >
              <Eye className="w-5 h-5" />
              <span>Details</span>
            </button>
            <button
              onClick={() => onSwipe(job, true)}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-xl font-bold transition flex items-center justify-center space-x-2 shadow-md"
            >
              <Heart className="w-5 h-5" />
              <span>{language === 'es' ? 'Interesado' : 'Interested'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component: Detail Item
const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center space-x-2">
    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
    </div>
  </div>
);

// Component: My Jobs Tab
const MyJobsTab = ({ matches, activeJobs, completedJobs, onOpenChat, currentUser, activeSubTab, setActiveSubTab }) => (
  <div className="space-y-6">
    {/* Sub Tabs */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex">
        <button
          onClick={() => setActiveSubTab('active')}
          className={`flex-1 px-6 py-4 font-semibold transition border-b-2 ${
            activeSubTab === 'active'
              ? 'border-blue-600 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-600 hover:bg-gray-50'
          }`}
        >
          Active Jobs ({activeJobs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('completed')}
          className={`flex-1 px-6 py-4 font-semibold transition border-b-2 ${
            activeSubTab === 'completed'
              ? 'border-blue-600 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-600 hover:bg-gray-50'
          }`}
        >
          Completed ({completedJobs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('all')}
          className={`flex-1 px-6 py-4 font-semibold transition border-b-2 ${
            activeSubTab === 'all'
              ? 'border-blue-600 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Matches ({matches.length})
        </button>
      </div>
    </div>

    {/* Job List */}
    <div className="space-y-4">
      {(activeSubTab === 'active' ? activeJobs :
        activeSubTab === 'completed' ? completedJobs :
        matches).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Jobs Yet</h3>
          <p className="text-gray-600">
            {activeSubTab === 'active' && "You don't have any active jobs"}
            {activeSubTab === 'completed' && "You haven't completed any jobs yet"}
            {activeSubTab === 'all' && "Start discovering jobs to see your matches here"}
          </p>
        </div>
      ) : (
        (activeSubTab === 'active' ? activeJobs :
          activeSubTab === 'completed' ? completedJobs :
          matches).map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onOpenChat={onOpenChat}
            currentUser={currentUser}
          />
        ))
      )}
    </div>
  </div>
);

// Component: Match Card
const MatchCard = ({ match, onOpenChat, currentUser }) => {
  const statusColors = {
    accepted: 'bg-blue-100 text-blue-700',
    quote_submitted: 'bg-yellow-100 text-yellow-700',
    interview_scheduled: 'bg-purple-100 text-purple-700',
    hired: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700'
  };

  const statusLabels = {
    accepted: 'Matched',
    quote_submitted: 'Quote Submitted',
    interview_scheduled: 'Interview Scheduled',
    hired: 'Hired',
    completed: 'Completed'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{match.job?.title}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[match.status]}`}>
              {statusLabels[match.status]}
            </span>
          </div>
          <p className="text-gray-600 mb-2">{match.employer?.name}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {match.job?.location}
            </div>
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              {match.job?.pay}
            </div>
            {match.quote && (
              <div className="flex items-center font-semibold text-green-600">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Quote: ${match.quote.amount.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Match Score */}
        <div className="text-center ml-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-2 shadow-md">
            <span className="text-white font-bold text-lg">{Math.round(match.matchScore)}</span>
          </div>
          <p className="text-xs text-gray-500">Match</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={() => onOpenChat(match)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center space-x-2"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Message</span>
          {match.unreadMessages > 0 && (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {match.unreadMessages}
            </span>
          )}
        </button>
        {!match.quote && match.status === 'accepted' && (
          <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>Submit Quote</span>
          </button>
        )}
      </div>
    </div>
  );
};

// Component: Interviews Tab
const InterviewsTab = ({ interviews, matches, currentUser, onReload }) => {
  const [showInterviewManager, setShowInterviewManager] = useState(false);

  return (
    <div className="space-y-6">
      {showInterviewManager ? (
        <InterviewManagement
          interviews={interviews}
          matches={matches}
          currentUser={currentUser}
          userType="worker"
          onUpdate={onReload}
          onClose={() => setShowInterviewManager(false)}
        />
      ) : (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Interviews</h2>
              <p className="text-gray-600 mt-1">Your scheduled video interviews</p>
            </div>
            <button
              onClick={() => setShowInterviewManager(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center space-x-2"
            >
              <Calendar className="w-5 h-5" />
              <span>Manage All Interviews</span>
            </button>
          </div>

          {/* Quick Interview List */}
          {interviews.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Interviews Scheduled</h3>
              <p className="text-gray-600">Your scheduled interviews will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.slice(0, 5).map(interview => (
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
              {interviews.length > 5 && (
                <button
                  onClick={() => setShowInterviewManager(true)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold transition"
                >
                  View All {interviews.length} Interviews
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Component: Portfolio Tab
const PortfolioTab = ({ portfolio, reviews, currentUser, onReload }) => (
  <div className="space-y-6">
    {/* Profile Overview */}
    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">{currentUser.name}</h2>
          <p className="text-blue-100 text-lg mb-4">{currentUser.skillsOffered?.join(' • ')}</p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Star className="w-5 h-5 text-yellow-300 fill-current mr-1" />
              <span className="font-bold text-lg">{currentUser.averageRating?.toFixed(1) || 'New'}</span>
              <span className="text-blue-100 ml-2">({currentUser.totalReviews || 0} reviews)</span>
            </div>
            <div className="text-blue-100">•</div>
            <div>{currentUser.experience || 'New to platform'}</div>
          </div>
        </div>
        <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center space-x-2">
          <Edit className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Certifications */}
      {currentUser.certifications && currentUser.certifications.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Certifications
          </h3>
          <div className="flex flex-wrap gap-2">
            {currentUser.certifications.map((cert, idx) => (
              <span key={idx} className="bg-white bg-opacity-20 px-3 py-1.5 rounded-lg text-sm font-medium">
                {cert}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Portfolio Images */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Portfolio</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center space-x-2">
          <Upload className="w-4 h-4" />
          <span>Upload Photos</span>
        </button>
      </div>

      {portfolio.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {portfolio.map((image) => (
            <div key={image.id} className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition cursor-pointer">
              <img
                src={image.imageUrl}
                alt={image.caption}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-900 mb-2">No Portfolio Items</h4>
          <p className="text-gray-600 mb-4">Showcase your best work to attract more clients</p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Upload Your First Photo
          </button>
        </div>
      )}
    </div>

    {/* Reviews */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Reviews & Ratings</h3>

      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{review.reviewer?.name}</p>
                  <p className="text-sm text-gray-600">{review.job?.title}</p>
                </div>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-2">{review.comment}</p>
              <p className="text-xs text-gray-500">{format(new Date(review.createdAt), 'MMMM d, yyyy')}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-900 mb-2">No Reviews Yet</h4>
          <p className="text-gray-600">Complete jobs to receive reviews from employers</p>
        </div>
      )}
    </div>
  </div>
);

// Component: Profile Tab
const ProfileTab = ({ currentUser, onReload }) => (
  <div className="max-w-3xl mx-auto space-y-6">
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
          <input
            type="text"
            defaultValue={currentUser.name}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
          <input
            type="text"
            defaultValue={currentUser.location}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Skills</label>
          <input
            type="text"
            defaultValue={currentUser.skillsOffered?.join(', ')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Separate skills with commas"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Pay</label>
          <input
            type="text"
            defaultValue={currentUser.pay}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Availability</label>
          <input
            type="text"
            defaultValue={currentUser.availability}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2">
          <Save className="w-5 h-5" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  </div>
);

// Component: Chat Modal
const ChatModal = ({ match, messages, newMessage, setNewMessage, onSend, onClose, language, currentUser }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50">
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
            className={`flex ${msg.senderId === 'ai' ? 'justify-start' : msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] rounded-xl px-4 py-3 shadow-sm ${
              msg.senderId === 'ai' ? 'bg-yellow-50 text-gray-900 border border-yellow-200' :
              msg.senderId === currentUser.id ? 'bg-blue-600 text-white' :
              'bg-white text-gray-900 border border-gray-200'
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

// Component: Job Details Modal
const JobDetailsModal = ({ job, currentUser, onClose, onApply }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
    <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl text-white">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{job.title}</h2>
                <p className="text-blue-100">{job.employer?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 mt-4">
              <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                <span className="font-bold text-lg">{Math.round(job.matchScore)}% Match</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* Quick Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <MapPin className="w-5 h-5 text-gray-400 mb-2" />
            <p className="text-xs text-gray-600">Location</p>
            <p className="font-semibold text-gray-900">{job.location}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <DollarSign className="w-5 h-5 text-gray-400 mb-2" />
            <p className="text-xs text-gray-600">Pay</p>
            <p className="font-semibold text-gray-900">{job.pay}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Clock className="w-5 h-5 text-gray-400 mb-2" />
            <p className="text-xs text-gray-600">Duration</p>
            <p className="font-semibold text-gray-900">{job.duration || 'Flexible'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Calendar className="w-5 h-5 text-gray-400 mb-2" />
            <p className="text-xs text-gray-600">Start Date</p>
            <p className="font-semibold text-gray-900">
              {format(new Date(job.startDate || new Date()), 'MMM d')}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Job Description</h3>
          <p className="text-gray-700 leading-relaxed">{job.description}</p>
        </div>

        {/* Skills */}
        {job.skillsRequired && job.skillsRequired.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.skillsRequired.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 rounded-lg font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Employer Info */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">About the Employer</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Company:</strong> {job.employer?.company}</p>
            <p><strong>Location:</strong> {job.employer?.location}</p>
            {job.employer?.totalReviews > 0 && (
              <div className="flex items-center">
                <strong className="mr-2">Rating:</strong>
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                <span>{job.employer?.averageRating?.toFixed(1)} ({job.employer?.totalReviews} reviews)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold transition"
          >
            Close
          </button>
          <button
            onClick={() => onApply(job)}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center space-x-2"
          >
            <Heart className="w-5 h-5" />
            <span>Express Interest</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default WorkerDashboard;