import React, { useState } from 'react';
import { Star, Send, Award } from 'lucide-react';
import { db } from '../database/db';

const ReviewForm = ({ job, targetUser, currentUser, onSubmitSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    quality: 0,
    communication: 0,
    timeliness: 0,
    professionalism: 0
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCategoryChange = (category, value) => {
    setCategories({
      ...categories,
      [category]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      alert('Please write a review comment');
      return;
    }

    setSubmitting(true);

    try {
      // Check if review already exists
      const existingReview = await db.reviews
        .where({ jobId: job.id, reviewerId: currentUser.id })
        .first();

      if (existingReview) {
        alert('You have already reviewed this job');
        return;
      }

      // Create review
      await db.reviews.add({
        jobId: job.id,
        reviewerId: currentUser.id,
        revieweeId: targetUser.id,
        rating,
        comment: comment.trim(),
        categories,
        createdAt: new Date()
      });

      // Update user's average rating
      await updateUserRating(targetUser.id);

      alert('Review submitted successfully!');

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateUserRating = async (userId) => {
    const reviews = await db.reviews
      .where('revieweeId')
      .equals(userId)
      .toArray();

    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await db.users.update(userId, {
        averageRating: avgRating,
        totalReviews: reviews.length
      });
    }
  };

  const isWorker = currentUser.userType === 'worker';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <Award className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Rate Your Experience
        </h2>
        <p className="text-gray-600">
          Review {isWorker ? 'employer' : 'worker'}: <span className="font-semibold">{targetUser.name}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">Job: {job.title}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Rating */}
        <div className="text-center">
          <label className="block text-lg font-semibold text-gray-900 mb-4">
            Overall Rating *
          </label>
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition transform hover:scale-110"
              >
                <Star
                  className={`w-12 h-12 ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {rating === 0 && 'Click to rate'}
            {rating === 1 && '1 - Poor'}
            {rating === 2 && '2 - Fair'}
            {rating === 3 && '3 - Good'}
            {rating === 4 && '4 - Very Good'}
            {rating === 5 && '5 - Excellent'}
          </p>
        </div>

        {/* Category Ratings */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 mb-4">Rate Specific Aspects</h3>

          {/* Quality */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                {isWorker ? 'Job Description Accuracy' : 'Work Quality'}
              </label>
              <span className="text-sm text-blue-600 font-semibold">
                {categories.quality}/5
              </span>
            </div>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleCategoryChange('quality', star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= categories.quality
                        ? 'text-blue-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Communication */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Communication</label>
              <span className="text-sm text-blue-600 font-semibold">
                {categories.communication}/5
              </span>
            </div>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleCategoryChange('communication', star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= categories.communication
                        ? 'text-blue-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Timeliness */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                {isWorker ? 'Payment Timeliness' : 'Work Completion Time'}
              </label>
              <span className="text-sm text-blue-600 font-semibold">
                {categories.timeliness}/5
              </span>
            </div>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleCategoryChange('timeliness', star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= categories.timeliness
                        ? 'text-blue-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Professionalism */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Professionalism</label>
              <span className="text-sm text-blue-600 font-semibold">
                {categories.professionalism}/5
              </span>
            </div>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleCategoryChange('professionalism', star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= categories.professionalism
                        ? 'text-blue-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Written Review */}
        <div>
          <label htmlFor="comment" className="block text-sm font-semibold text-gray-700 mb-2">
            Written Review *
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="5"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Share your experience working ${isWorker ? 'for' : 'with'} ${targetUser.name}...`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum 20 characters ({comment.length}/20)
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || rating === 0 || comment.length < 20}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Review</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;