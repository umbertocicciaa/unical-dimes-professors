import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TeacherDetail from '../TeacherDetail';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../api/client', () => ({
  apiClient: {
    getTeacher: jest.fn(),
    getTeacherReviews: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext');

const mockedGetTeacher = apiClient.getTeacher as jest.Mock;
const mockedGetTeacherReviews = apiClient.getTeacherReviews as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;

const teacherResponse = {
  data: {
    id: 1,
    name: 'Grace Hopper',
    department: 'Computer Science',
    created_at: '2024-01-01',
    courses: [
      { id: 10, name: 'Compiler Design', teacher_id: 1, created_at: '2024-01-01' },
    ],
  },
};

const reviewsResponse = {
  data: [
    {
      id: 20,
      teacher_id: 1,
      course_id: 10,
      rating: 5,
      description: 'Inspiring lectures!',
      created_at: '2024-01-02',
    },
  ],
};

describe('TeacherDetail', () => {
  beforeEach(() => {
    mockedGetTeacher.mockResolvedValue(teacherResponse);
    mockedGetTeacherReviews.mockResolvedValue(reviewsResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRoute = () =>
    render(
      <MemoryRouter initialEntries={['/teacher/1']}>
        <Routes>
          <Route path="/teacher/:id" element={<TeacherDetail />} />
        </Routes>
      </MemoryRouter>,
    );

  it('renders teacher information and allows opening the review form', async () => {
    mockedUseAuth.mockReturnValue({
      user: { email: 'user@example.com', roles: [{ name: 'viewer' }] },
      hasRole: () => true,
      loading: false,
    });

    renderWithRoute();

    expect(screen.getByText(/Loading teacher details/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Grace Hopper')).toBeInTheDocument());
    expect(screen.getByText('Compiler Design')).toBeInTheDocument();
    expect(screen.getByText(/Inspiring lectures/i)).toBeInTheDocument();
    const addReviewButton = screen.getByRole('button', { name: /\+ Add Review/i });
    expect(addReviewButton).toBeInTheDocument();

    await userEvent.click(addReviewButton);
    expect(screen.getByText('Write a Review')).toBeInTheDocument();
  });

  it('prompts unauthenticated users to login', async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      hasRole: () => false,
      loading: false,
    });

    renderWithRoute();
    await waitFor(() => expect(mockedGetTeacher).toHaveBeenCalled());
    expect(await screen.findByRole('link', { name: /Login to add a review/i })).toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      hasRole: () => false,
      loading: false,
    });
    mockedGetTeacher.mockRejectedValueOnce(new Error('boom'));

    renderWithRoute();

    await waitFor(() => expect(screen.getByText(/Failed to load teacher/i)).toBeInTheDocument());
  });
});
