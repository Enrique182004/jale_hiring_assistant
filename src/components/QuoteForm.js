import React, { useState } from 'react';
import { DollarSign, Hammer, Clock, FileText } from 'lucide-react';
import { db } from '../database/db';

const QuoteForm = ({ job, currentUser, onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    materialsCost: '',
    laborCost: '',
    estimatedDuration: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateTotal = () => {
    const materials = parseFloat(formData.materialsCost) || 0;
    const labor = parseFloat(formData.laborCost) || 0;
    return materials + labor;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.materialsCost || !formData.laborCost) {
      alert('Please enter both materials and labor costs');
      return;
    }

    setSubmitting(true);

    try {
      const total = calculateTotal();

      // Create quote
      const quoteId = await db.quotes.add({
        jobId: job.id,
        workerId: currentUser.id,
        amount: total,
        materialsCost: parseFloat(formData.materialsCost),
        laborCost: parseFloat(formData.laborCost),
        estimatedDuration: formData.estimatedDuration,
        description: formData.description,
        status: 'pending',
        createdAt: new Date()
      });

      // Create or get match
      let match = await db.matches
        .where({ jobId: job.id, workerId: currentUser.id })
        .first();

      if (!match) {
        const matchId = await db.matches.add({
          jobId: job.id,
          workerId: currentUser.id,
          status: 'quote_submitted',
          matchScore: 85, // Default score for quote submissions
          createdAt: new Date()
        });
        match = { id: matchId };
      }

      // Send notification to employer
      await db.messages.add({
        matchId: match.id,
        senderId: 'system',
        message: `New quote received from ${currentUser.name}: $${total.toFixed(2)}`,
        messageType: 'quote_notification',
        timestamp: new Date()
      });

      alert('Quote submitted successfully!');
      
      if (onSubmitSuccess) {
        onSubmitSuccess(quoteId);
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      alert('Error submitting quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Your Quote</h2>
        <p className="text-gray-600">
          Provide a detailed quote for: <span className="font-semibold">{job.title}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Materials Cost */}
        <div>
          <label htmlFor="materialsCost" className="block text-sm font-semibold text-gray-700 mb-2">
            <div className="flex items-center space-x-2">
              <Hammer className="w-4 h-4 text-blue-600" />
              <span>Materials Cost *</span>
            </div>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              id="materialsCost"
              name="materialsCost"
              value={formData.materialsCost}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Cost of all materials needed for the job</p>
        </div>

        {/* Labor Cost */}
        <div>
          <label htmlFor="laborCost" className="block text-sm font-semibold text-gray-700 mb-2">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span>Labor Cost *</span>
            </div>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              id="laborCost"
              name="laborCost"
              value={formData.laborCost}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Your labor charges for completing the work</p>
        </div>

        {/* Estimated Duration */}
        <div>
          <label htmlFor="estimatedDuration" className="block text-sm font-semibold text-gray-700 mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Estimated Duration</span>
            </div>
          </label>
          <input
            type="text"
            id="estimatedDuration"
            name="estimatedDuration"
            value={formData.estimatedDuration}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 2-3 days, 5 hours"
          />
          <p className="text-xs text-gray-500 mt-1">How long will the job take?</p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Quote Details</span>
            </div>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Provide details about your approach, materials to be used, timeline, etc."
          />
          <p className="text-xs text-gray-500 mt-1">Explain what's included in your quote</p>
        </div>

        {/* Total */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Quote Amount</p>
              <p className="text-3xl font-bold text-blue-600">
                ${calculateTotal().toFixed(2)}
              </p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Materials: ${(parseFloat(formData.materialsCost) || 0).toFixed(2)}</p>
              <p>Labor: ${(parseFloat(formData.laborCost) || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <DollarSign className="w-5 h-5" />
              <span>Submit Quote</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default QuoteForm;