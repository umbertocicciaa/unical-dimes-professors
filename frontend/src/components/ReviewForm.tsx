import React, { useState } from 'react';
import {
  apiClient,
  Teacher,
  CreateReview,
  Course,
  ReviewModerationRequest,
  ReviewModerationVerdict,
} from '../api/client';
import StarRating from './StarRating';
import './ReviewForm.css';

interface ReviewFormProps {
  teacher: Teacher;
  onSubmit: () => void;
  onCancel: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ teacher, onSubmit, onCancel }) => {
  const [rating, setRating] = useState(0);
  const [courseId, setCourseId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [moderationFeedback, setModerationFeedback] = useState<ReviewModerationVerdict | null>(null);

  const resetModerationFeedback = () => {
    if (moderationFeedback) {
      setModerationFeedback(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    
    if (!courseId) {
      setError('Please select a course');
      return;
    }
    
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      resetModerationFeedback();

      const reviewData: CreateReview = {
        teacher_id: teacher.id,
        course_id: Number(courseId),
        rating,
        description: description.trim(),
      };

      const moderationPayload: ReviewModerationRequest = {
        teacher_id: teacher.id,
        course_id: Number(courseId),
        text: description.trim(),
        rating,
      };

      const { data: moderationVerdict } = await apiClient.moderateReview(moderationPayload);
      if (!moderationVerdict.allowed) {
        setModerationFeedback(moderationVerdict);
        return;
      }

      await apiClient.createReview(reviewData);
      onSubmit();
    } catch (err: any) {
      const detail: ReviewModerationVerdict | undefined = err.response?.data?.detail;

      if (err.response?.status === 422 && detail?.allowed === false) {
        setModerationFeedback(detail);
      } else if (err.response?.status === 400 && detail?.allowed === false) {
        setModerationFeedback(detail);
      } else if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to submit reviews.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to submit review. Please try again.');
      }
      console.error('Error submitting review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const applyModerationSuggestion = () => {
    if (moderationFeedback?.suggestion) {
      setDescription(moderationFeedback.suggestion);
      setModerationFeedback(null);
    }
  };

  const isLanguageBlock = moderationFeedback?.blockedReasons.includes('UNSUPPORTED_LANGUAGE');
  const shouldShowSuggestionButton = Boolean(moderationFeedback?.suggestion) && !isLanguageBlock;

  return (
    <div className="review-form">
      <h3>Write a Review</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Rating *</label>
          <StarRating 
            rating={rating} 
            onRatingChange={setRating}
            size="large"
          />
        </div>

        <div className="form-group">
          <label htmlFor="course">Course *</label>
          <select
            id="course"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              resetModerationFeedback();
            }}
            required
          >
            <option value="">Select a course</option>
            {teacher.courses.map((course: Course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              resetModerationFeedback();
            }}
            placeholder="Share your experience with this teacher and course (minimum 10 characters)"
            rows={5}
            required
            minLength={10}
          />
          <span className="char-count">
            {description.length} characters
          </span>
        </div>

        {error && <div className="form-error">{error}</div>}

        {moderationFeedback && (
          <div className="moderation-warning" role="alert">
            <h4>Review needs edits</h4>
            <p>{moderationFeedback.message}</p>
            {moderationFeedback.blockedReasons.length > 0 && (
              <div className="moderation-reasons">
                {moderationFeedback.blockedReasons.map((reason) => (
                  <span key={reason} className="moderation-pill">
                    {reason.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
            {moderationFeedback.suggestion && (
              <div className="moderation-suggestion">
                <strong>Try this focus:</strong>
                <p>{moderationFeedback.suggestion}</p>
                {shouldShowSuggestionButton && (
                  <button
                    type="button"
                    className="inline-btn"
                    onClick={applyModerationSuggestion}
                    disabled={submitting}
                  >
                    Use suggestion
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-actions">
          <button 
            type="button" 
            onClick={onCancel}
            className="cancel-btn"
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
