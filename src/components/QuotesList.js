import React, { useState, useEffect } from 'react';
import { DollarSign, User, Clock, CheckCircle, XCircle, Star, MessageSquare } from 'lucide-react';
import { db } from '../database/db';

const QuotesList = ({ jobId, onAcceptQuote }) => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, [jobId]);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const jobQuotes = await db.quotes
        .where({ jobId })
        .toArray();

      const enrichedQuotes = await Promise.all(
        jobQuotes.map(async (quote) => {
          const worker = await db.users.get(quote.workerId);
          
          // Get worker's reviews
          const reviews = await db.reviews
            .where('revieweeId')
            .equals(quote.workerId)
            .toArray();

          const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

          return {
            ...quote,
            worker,
            workerRating: avgRating,
            workerReviewCount: reviews.length
          };
        })
      );

      // Sort by status (pending first) then by amount (lowest first)
      enrichedQuotes.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return a.amount - b.amount;
      });

      setQuotes(enrichedQuotes);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptQuote = async (quote) => {
    if (!window.confirm(`Accept quote from ${quote.worker.name} for $${quote.amount.toFixed(2)}?`)) {
      return;
    }

    try {
      // Update quote status
      await db.quotes.update(quote.id, { status: 'accepted' });

      // Reject other quotes for this job
      const otherQuotes = quotes.filter(q => q.id !== quote.id && q.status === 'pending');
      for (const otherQuote of otherQuotes) {
        await db.quotes.update(otherQuote.id, { status: 'rejected' });
      }

      // Create or update match
      let match = await db.matches
        .where({ jobId, workerId: quote.workerId })
        .first();

      if (!match) {
        const matchId = await db.matches.add({
          jobId,
          workerId: quote.workerId,
          status: 'quote_accepted',
          matchScore: 90,
          createdAt: new Date()
        });
        match = { id: matchId };
      } else {
        await db.matches.update(match.id, { status: 'quote_accepted' });
      }

      // Send notification to worker
      await db.messages.add({
        matchId: match.id,
        senderId: 'system',
        message: `Great news! Your quote of $${quote.amount.toFixed(2)} has been accepted. The employer will contact you shortly to schedule the work.`,
        messageType: 'quote_accepted',
        timestamp: new Date()
      });

      alert('Quote accepted! The worker has been notified.');
      
      if (onAcceptQuote) {
        onAcceptQuote(quote);
      }

      await loadQuotes();
    } catch (error) {
      console.error('Error accepting quote:', error);
      alert('Error accepting quote. Please try again.');
    }
  };

  const rejectQuote = async (quote) => {
    if (!window.confirm(`Reject quote from ${quote.worker.name}?`)) {
      return;
    }

    try {
      await db.quotes.update(quote.id, { status: 'rejected' });
      alert('Quote rejected');
      await loadQuotes();
    } catch (error) {
      console.error('Error rejecting quote:', error);
      alert('Error rejecting quote. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Quotes Yet</h3>
        <p className="text-gray-600">Waiting for workers to submit their quotes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Received Quotes ({quotes.length})
        </h2>
        <p className="text-gray-600 mt-1">
          {quotes.filter(q => q.status === 'pending').length} pending quotes
        </p>
      </div>

      {quotes.map((quote) => (
        <div
          key={quote.id}
          className={`bg-white rounded-xl border-2 p-6 transition ${
            quote.status === 'accepted'
              ? 'border-green-500 bg-green-50'
              : quote.status === 'rejected'
              ? 'border-gray-300 bg-gray-50 opacity-60'
              : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{quote.worker?.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-semibold text-gray-700 ml-1">
                      {quote.workerRating > 0 ? quote.workerRating.toFixed(1) : 'New'}
                    </span>
                  </div>
                  {quote.workerReviewCount > 0 && (
                    <span className="text-sm text-gray-500">
                      ({quote.workerReviewCount} reviews)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                quote.status === 'accepted'
                  ? 'bg-green-100 text-green-700'
                  : quote.status === 'rejected'
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {quote.status === 'accepted' && '✓ Accepted'}
              {quote.status === 'rejected' && '✗ Rejected'}
              {quote.status === 'pending' && '⏳ Pending'}
            </span>
          </div>

          {/* Quote Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">
                ${quote.amount.toFixed(2)}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Materials</p>
              <p className="text-xl font-semibold text-gray-700">
                ${quote.materialsCost.toFixed(2)}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Labor</p>
              <p className="text-xl font-semibold text-gray-700">
                ${quote.laborCost.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Duration */}
          {quote.estimatedDuration && (
            <div className="flex items-center space-x-2 text-gray-700 mb-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                Estimated Duration: <span className="font-semibold">{quote.estimatedDuration}</span>
              </span>
            </div>
          )}

          {/* Description */}
          {quote.description && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Quote Details:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.description}</p>
            </div>
          )}

          {/* Skills */}
          {quote.worker?.skillsOffered && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Worker Skills:</p>
              <div className="flex flex-wrap gap-2">
                {quote.worker.skillsOffered.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {quote.status === 'pending' && (
            <div className="flex space-x-3">
              <button
                onClick={() => acceptQuote(quote)}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Accept Quote</span>
              </button>
              <button
                onClick={() => rejectQuote(quote)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center space-x-2"
              >
                <XCircle className="w-5 h-5" />
                <span>Reject</span>
              </button>
            </div>
          )}

          {quote.status === 'accepted' && (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm font-semibold flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Quote accepted! You can now message {quote.worker?.name} to schedule the work.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default QuotesList;