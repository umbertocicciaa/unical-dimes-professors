import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, Teacher } from '../api/client';
import StarRating from './StarRating';
import './TeacherList.css';

const TeacherList: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTeachers();
      setTeachers(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load teachers. Please try again later.');
      console.error('Error loading teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading teachers...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="teacher-list">
      <h1>Professor Reviews</h1>
      <p className="subtitle">Browse and review professors anonymously</p>
      
      {teachers.length === 0 ? (
        <div className="no-teachers">
          <p>No teachers found. Be the first to add one!</p>
        </div>
      ) : (
        <div className="teachers-grid">
          {teachers.map((teacher) => (
            <Link 
              to={`/teacher/${teacher.id}`} 
              key={teacher.id} 
              className="teacher-card"
            >
              <div className="teacher-header">
                <h3>{teacher.name}</h3>
                {teacher.department && (
                  <span className="department">{teacher.department}</span>
                )}
              </div>
              
              <div className="teacher-rating">
                {teacher.average_rating ? (
                  <>
                    <StarRating 
                      rating={teacher.average_rating} 
                      readonly 
                      size="medium"
                    />
                    <span className="rating-value">
                      {teacher.average_rating.toFixed(1)}
                    </span>
                  </>
                ) : (
                  <span className="no-rating">No reviews yet</span>
                )}
              </div>
              
              <div className="teacher-stats">
                <span>{teacher.review_count} review{teacher.review_count !== 1 ? 's' : ''}</span>
                <span>{teacher.courses.length} course{teacher.courses.length !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherList;
