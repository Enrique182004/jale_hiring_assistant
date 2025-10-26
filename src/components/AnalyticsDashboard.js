import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Briefcase, Users, Star, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { db } from '../database/db';

const AnalyticsDashboard = ({ currentUser }) => {
  const [timeRange, setTimeRange] = useState('30days');
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const isEmployer = currentUser.userType === 'employer';

  useEffect(() => {
    loadMetrics();
  }, [timeRange, currentUser]);

  const loadMetrics = async () => {
    setLoading(true);
    
    const now = new Date();
    let startDate = new Date();
    
    switch(timeRange) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(2000, 0, 1);
    }

    if (isEmployer) {
      await loadEmployerMetrics(startDate);
    } else {
      await loadWorkerMetrics(startDate);
    }

    setLoading(false);
  };

  const loadEmployerMetrics = async (startDate) => {
    // Get jobs
    const jobs = await db.jobs
      .where('employerId')
      .equals(currentUser.id)
      .and(job => new Date(job.createdAt) >= startDate)
      .toArray();

    // Get quotes for those jobs
    const jobIds = jobs.map(j => j.id);
    const quotes = await db.quotes.toArray();
    const relevantQuotes = quotes.filter(q => jobIds.includes(q.jobId));
    
    // Get matches
    const matches = await db.matches.toArray();
    const relevantMatches = matches.filter(m => jobIds.includes(m.jobId));

    // Calculate metrics
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'active').length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const avgQuotesPerJob = totalJobs > 0 ? relevantQuotes.length / totalJobs : 0;
    const acceptedQuotes = relevantQuotes.filter(q => q.status === 'accepted');
    const totalSpent = acceptedQuotes.reduce((sum, q) => sum + q.amount, 0);
    const avgQuoteAmount = acceptedQuotes.length > 0 ? totalSpent / acceptedQuotes.length : 0;

    setMetrics({
      totalJobs,
      activeJobs,
      completedJobs,
      totalSpent,
      avgQuoteAmount,
      avgQuotesPerJob,
      totalQuotes: relevantQuotes.length,
      pendingQuotes: relevantQuotes.filter(q => q.status === 'pending').length,
      totalMatches: relevantMatches.length,
      acceptedMatches: relevantMatches.filter(m => m.status === 'accepted').length
    });
  };

  const loadWorkerMetrics = async (startDate) => {
    // Get matches
    const matches = await db.matches
      .where('workerId')
      .equals(currentUser.id)
      .and(match => new Date(match.createdAt) >= startDate)
      .toArray();

    // Get quotes
    const quotes = await db.quotes
      .where('workerId')
      .equals(currentUser.id)
      .and(quote => new Date(quote.createdAt) >= startDate)
      .toArray();

    // Get reviews
    const reviews = await db.reviews
      .where('revieweeId')
      .equals(currentUser.id)
      .and(review => new Date(review.createdAt) >= startDate)
      .toArray();

    // Calculate metrics
    const totalJobs = matches.filter(m => m.status === 'hired' || m.status === 'completed').length;
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
    const totalEarnings = acceptedQuotes.reduce((sum, q) => sum + q.amount, 0);
    const avgEarningsPerJob = totalJobs > 0 ? totalEarnings / totalJobs : 0;
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    const quoteAcceptanceRate = quotes.length > 0 ? (acceptedQuotes.length / quotes.length) * 100 : 0;

    setMetrics({
      totalJobs,
      activeJobs: matches.filter(m => m.status === 'accepted').length,
      completedJobs: matches.filter(m => m.status === 'completed').length,
      totalEarnings,
      avgEarningsPerJob,
      totalQuotes: quotes.length,
      acceptedQuotes: acceptedQuotes.length,
      pendingQuotes: quotes.filter(q => q.status === 'pending').length,
      avgRating,
      totalReviews: reviews.length,
      quoteAcceptanceRate,
      totalMatches: matches.length
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Track your performance and insights</p>
        </div>
        
        {/* Time Range Selector */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
          <option value="1year">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Key Metrics Grid */}
      {isEmployer ? (
        <EmployerMetrics metrics={metrics} />
      ) : (
        <WorkerMetrics metrics={metrics} />
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Job Status Distribution</h3>
          <div className="space-y-3">
            <ProgressBar
              label="Active"
              value={metrics.activeJobs || 0}
              total={metrics.totalJobs || 1}
              color="blue"
            />
            <ProgressBar
              label="Completed"
              value={metrics.completedJobs || 0}
              total={metrics.totalJobs || 1}
              color="green"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Quote Performance</h3>
          <div className="space-y-3">
            <ProgressBar
              label="Accepted"
              value={metrics.acceptedQuotes || 0}
              total={metrics.totalQuotes || 1}
              color="green"
            />
            <ProgressBar
              label="Pending"
              value={metrics.pendingQuotes || 0}
              total={metrics.totalQuotes || 1}
              color="yellow"
            />
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
          Key Insights
        </h3>
        <div className="space-y-2">
          {isEmployer ? (
            <>
              <InsightItem
                text={`You receive an average of ${metrics.avgQuotesPerJob?.toFixed(1)} quotes per job`}
                trend="neutral"
              />
              <InsightItem
                text={`Average quote accepted: $${metrics.avgQuoteAmount?.toFixed(2)}`}
                trend="neutral"
              />
              {metrics.totalMatches > 0 && (
                <InsightItem
                  text={`${((metrics.acceptedMatches / metrics.totalMatches) * 100).toFixed(0)}% of candidates are accepted`}
                  trend={metrics.acceptedMatches / metrics.totalMatches > 0.5 ? 'up' : 'down'}
                />
              )}
            </>
          ) : (
            <>
              {metrics.quoteAcceptanceRate > 0 && (
                <InsightItem
                  text={`${metrics.quoteAcceptanceRate.toFixed(0)}% of your quotes are accepted`}
                  trend={metrics.quoteAcceptanceRate > 30 ? 'up' : 'down'}
                />
              )}
              <InsightItem
                text={`Average earnings per job: $${metrics.avgEarningsPerJob?.toFixed(2)}`}
                trend="neutral"
              />
              {metrics.avgRating > 0 && (
                <InsightItem
                  text={`Your average rating is ${metrics.avgRating.toFixed(1)}/5.0 stars`}
                  trend={metrics.avgRating >= 4.5 ? 'up' : 'neutral'}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const EmployerMetrics = ({ metrics }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <MetricCard
      title="Total Jobs Posted"
      value={metrics.totalJobs || 0}
      icon={Briefcase}
      color="blue"
      subtitle={`${metrics.activeJobs || 0} active`}
    />
    <MetricCard
      title="Total Spent"
      value={`$${(metrics.totalSpent || 0).toFixed(2)}`}
      icon={DollarSign}
      color="green"
      subtitle={`Avg: $${(metrics.avgQuoteAmount || 0).toFixed(2)}`}
    />
    <MetricCard
      title="Quotes Received"
      value={metrics.totalQuotes || 0}
      icon={Users}
      color="purple"
      subtitle={`${metrics.pendingQuotes || 0} pending`}
    />
    <MetricCard
      title="Completed Jobs"
      value={metrics.completedJobs || 0}
      icon={Calendar}
      color="orange"
      subtitle={`${metrics.totalJobs > 0 ? ((metrics.completedJobs / metrics.totalJobs) * 100).toFixed(0) : 0}% completion rate`}
    />
  </div>
);

const WorkerMetrics = ({ metrics }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <MetricCard
      title="Total Earnings"
      value={`$${(metrics.totalEarnings || 0).toFixed(2)}`}
      icon={DollarSign}
      color="green"
      subtitle={`Avg: $${(metrics.avgEarningsPerJob || 0).toFixed(2)}/job`}
    />
    <MetricCard
      title="Jobs Completed"
      value={metrics.completedJobs || 0}
      icon={Briefcase}
      color="blue"
      subtitle={`${metrics.activeJobs || 0} active`}
    />
    <MetricCard
      title="Average Rating"
      value={metrics.avgRating ? metrics.avgRating.toFixed(1) : 'N/A'}
      icon={Star}
      color="yellow"
      subtitle={`${metrics.totalReviews || 0} reviews`}
    />
    <MetricCard
      title="Quote Success"
      value={`${(metrics.quoteAcceptanceRate || 0).toFixed(0)}%`}
      icon={TrendingUp}
      color="purple"
      subtitle={`${metrics.acceptedQuotes || 0}/${metrics.totalQuotes || 0} accepted`}
    />
  </div>
);

const MetricCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
};

const ProgressBar = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {value} / {total} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-full rounded-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const InsightItem = ({ text, trend }) => {
  const trendIcons = {
    up: <ArrowUp className="w-4 h-4 text-green-600" />,
    down: <ArrowDown className="w-4 h-4 text-red-600" />,
    neutral: null
  };

  return (
    <div className="flex items-start space-x-2">
      <div className="flex-shrink-0 mt-0.5">
        {trendIcons[trend] || <div className="w-4 h-4 rounded-full bg-blue-600" />}
      </div>
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
};

export default AnalyticsDashboard;