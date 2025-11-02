import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Role {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles: Role[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

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
  moderation_allowed?: boolean;
  moderation_blocked_reasons?: string[] | null;
  moderation_scores?: Record<string, number> | null;
  moderation_model_version?: string | null;
  moderation_message?: string | null;
}

export interface CreateReview {
  teacher_id: number;
  course_id: number;
  rating: number;
  description: string;
}

export interface ReviewModerationRequest {
  teacher_id: number;
  course_id: number;
  text: string;
  rating?: number;
}

export interface ReviewModerationVerdict {
  allowed: boolean;
  blockedReasons: string[];
  message: string;
  scores: Record<string, number>;
  modelVersion: string;
  suggestion?: string | null;
}

export interface CreateTeacher {
  name: string;
  department?: string;
}

export interface UpdateTeacher {
  name?: string;
  department?: string;
}

export interface CreateCourse {
  name: string;
  teacher_id: number;
}

export interface UpdateCourse {
  name?: string;
  teacher_id?: number;
}

export interface UpdateReview {
  rating?: number;
  description?: string;
  teacher_id?: number;
  course_id?: number;
}

export interface UserAdminUpdate {
  role_names?: string[];
  is_active?: boolean;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAccessToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const authApi = {
  register: (data: RegisterRequest) => api.post<AuthenticatedUser>('/auth/register', data),
  login: (data: LoginRequest) => api.post<TokenResponse>('/auth/login', data),
  refresh: (data: RefreshRequest) => api.post<TokenResponse>('/auth/refresh', data),
  logout: (data: RefreshRequest) => api.post<void>('/auth/logout', data),
  me: () => api.get<AuthenticatedUser>('/auth/me'),
};

export const apiClient = {
  getTeachers: () => api.get<Teacher[]>('/api/teachers'),
  getTeacher: (id: number) => api.get<Teacher>(`/api/teachers/${id}`),
  createTeacher: (data: CreateTeacher) => api.post<Teacher>('/api/teachers', data),
  updateTeacher: (id: number, data: UpdateTeacher) => api.put<Teacher>(`/api/teachers/${id}`, data),
  deleteTeacher: (id: number) => api.delete<void>(`/api/teachers/${id}`),

  getCourses: () => api.get<Course[]>('/api/courses'),
  getCourse: (id: number) => api.get<Course>(`/api/courses/${id}`),
  createCourse: (data: CreateCourse) => api.post<Course>('/api/courses', data),
  updateCourse: (id: number, data: UpdateCourse) => api.put<Course>(`/api/courses/${id}`, data),
  deleteCourse: (id: number) => api.delete<void>(`/api/courses/${id}`),

  getReviews: () => api.get<Review[]>('/api/reviews'),
  getTeacherReviews: (teacherId: number) => api.get<Review[]>(`/api/teachers/${teacherId}/reviews`),
  moderateReview: (data: ReviewModerationRequest) => api.post<ReviewModerationVerdict>('/api/reviews/moderate', data),
  createReview: (data: CreateReview) => api.post<Review>('/api/reviews', data),
  updateReview: (id: number, data: UpdateReview) => api.put<Review>(`/api/reviews/${id}`, data),
  deleteReview: (id: number) => api.delete<void>(`/api/reviews/${id}`),
};

export const adminApi = {
  getRoles: () => api.get<Role[]>('/admin/roles'),
  getUsers: (includeInactive = true) =>
    api.get<AuthenticatedUser[]>(`/admin/users`, { params: { include_inactive: includeInactive } }),
  updateUser: (userId: number, data: UserAdminUpdate) => api.put<AuthenticatedUser>(`/admin/users/${userId}`, data),
};
