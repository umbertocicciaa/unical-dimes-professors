import { render, screen, waitFor } from '@testing-library/react';
import TeacherList from '../TeacherList';
import { apiClient } from '../../api/client';

jest.mock('../../api/client', () => ({
  apiClient: {
    getTeachers: jest.fn(),
  },
}));

const mockedGetTeachers = apiClient.getTeachers as jest.Mock;

describe('TeacherList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('loads and displays teachers with statistics', async () => {
    mockedGetTeachers.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Ada Lovelace',
          department: 'Mathematics',
          average_rating: 4.5,
          review_count: 2,
          created_at: '2024-01-01',
          courses: [
            { id: 10, name: 'Analytical Engines', teacher_id: 1, created_at: '2024-01-01' },
          ],
        },
      ],
    });

    render(<TeacherList />);

    expect(screen.getByText(/Loading teachers/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('2 reviews')).toBeInTheDocument();
    expect(screen.getByText('1 course')).toBeInTheDocument();
  });

  it('handles empty results', async () => {
    mockedGetTeachers.mockResolvedValue({ data: [] });
    render(<TeacherList />);
    await waitFor(() => expect(screen.getByText(/No teachers found/i)).toBeInTheDocument());
  });

  it('shows an error message on failure', async () => {
    mockedGetTeachers.mockRejectedValue(new Error('network error'));
    render(<TeacherList />);
    await waitFor(() =>
      expect(screen.getByText(/Failed to load teachers/i)).toBeInTheDocument(),
    );
  });
});
