import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient, Teacher, Review, Course } from '../api/client';
import StarRating from './StarRating';
import ReviewForm from './ReviewForm';
import './TeacherDetail.css';

const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    loadTeacherData();
  }, [id]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      const [teacherResponse, reviewsResponse] = await Promise.all([
        apiClient.getTeacher(Number(id)),
        apiClient.getTeacherReviews(Number(id))
      ]);
      setTeacher(teacherResponse.data);
      setReviews(reviewsResponse.data);
      setError(null);
    } catch (err) {
      setError('Failed to load teacher data. Please try again later.');
      console.error('Error loading teacher:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    loadTeacherData();
  };

  if (loading) {
    return <div className="loading">Loading teacher details...</div>;
  }

  if (error || !teacher) {
    return (
      <div className="error">
        <p>{error || 'Teacher not found'}</p>
        <Link to="/" className="back-link">Back to teachers</Link>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="teacher-detail">
      <Link to="/" className="back-link">← Back to all teachers</Link>
      
      <div className="teacher-header-section">
        <div className="teacher-info">
          <h1>{teacher.name}</h1>
          {teacher.department && (
            <span className="department-badge">{teacher.department}</span>
          )}
        </div>
        
        <div className="teacher-rating-summary">
          {reviews.length > 0 ? (
            <>
              <div className="rating-display">
                <span className="rating-number">{averageRating.toFixed(1)}</span>
                <StarRating rating={averageRating} readonly size="large" />
              </div>
              <p className="review-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
            </>
          ) : (
            <p className="no-reviews">No reviews yet. Be the first to review!</p>
          )}
        </div>
      </div>

      <div className="courses-section">
        <h2>Courses</h2>
        {teacher.courses.length > 0 ? (
          <div className="courses-list">
            {teacher.courses.map((course: Course) => (
              <span key={course.id} className="course-tag">
                {course.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="no-courses">No courses listed yet.</p>
        )}
      </div>

      <div className="reviews-section">
        <div className="reviews-header">
          <h2>Reviews</h2>
          <button 
            className="add-review-btn"
            onClick={() => setShowReviewForm(!showReviewForm)}
          >
            {showReviewForm ? 'Cancel' : '+ Add Review'}
          </button>
        </div>

        {showReviewForm && (
          <ReviewForm
            teacher={teacher}
            onSubmit={handleReviewSubmitted}
            onCancel={() => setShowReviewForm(false)}
          />
        )}

        {reviews.length > 0 ? (
          <div className="reviews-list">
            {reviews.map((review) => {
              const course = teacher.courses.find((c: Course) => c.id === review.course_id);
              return (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    <StarRating rating={review.rating} readonly size="small" />
                    <span className="review-date">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {course && (
                    <div className="review-course">Course: {course.name}</div>
                  )}
                  <p className="review-description">{review.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          !showReviewForm && (
            <p className="no-reviews-message">No reviews yet. Be the first to leave a review!</p>
          )
        )}
      </div>
    </div>
  );
};

export default TeacherDetail;
