import React, { useState } from 'react';
import { apiClient, Teacher, CreateReview, Course } from '../api/client';
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

      const reviewData: CreateReview = {
        teacher_id: teacher.id,
        course_id: Number(courseId),
        rating,
        description: description.trim(),
      };

      await apiClient.createReview(reviewData);
      onSubmit();
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to submit review. Please try again.');
      }
      console.error('Error submitting review:', err);
    } finally {
      setSubmitting(false);
    }
  };

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
            onChange={(e) => setCourseId(e.target.value)}
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
            onChange={(e) => setDescription(e.target.value)}
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
