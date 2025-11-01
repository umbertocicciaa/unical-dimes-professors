import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Teacher {
  id: number;
  name: string;
  department?: string;
  average_rating?: number;
  review_count: number;
  courses: Course[];
  created_at: string;
}

export interface Course {
  id: number;
  name: string;
  teacher_id: number;
  created_at: string;
}

export interface Review {
  id: number;
  teacher_id: number;
  course_id: number;
  rating: number;
  description: string;
  created_at: string;
}

export interface CreateReview {
  teacher_id: number;
  course_id: number;
  rating: number;
  description: string;
}

export interface CreateTeacher {
  name: string;
  department?: string;
}

export interface CreateCourse {
  name: string;
  teacher_id: number;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  getTeachers: () => api.get<Teacher[]>('/api/teachers'),
  getTeacher: (id: number) => api.get<Teacher>(`/api/teachers/${id}`),
  createTeacher: (data: CreateTeacher) => api.post<Teacher>('/api/teachers', data),
  
  getCourses: () => api.get<Course[]>('/api/courses'),
  getCourse: (id: number) => api.get<Course>(`/api/courses/${id}`),
  createCourse: (data: CreateCourse) => api.post<Course>('/api/courses', data),
  
  getReviews: () => api.get<Review[]>('/api/reviews'),
  getTeacherReviews: (teacherId: number) => api.get<Review[]>(`/api/teachers/${teacherId}/reviews`),
  createReview: (data: CreateReview) => api.post<Review>('/api/reviews', data),
};
