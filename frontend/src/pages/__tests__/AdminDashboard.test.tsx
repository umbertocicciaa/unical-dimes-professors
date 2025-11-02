import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../AdminDashboard';
import { useAuth } from '../../context/AuthContext';

const mockApiClient = {
  getTeachers: jest.fn(),
  getCourses: jest.fn(),
  getReviews: jest.fn(),
  createTeacher: jest.fn(),
  updateTeacher: jest.fn(),
  deleteTeacher: jest.fn(),
  createCourse: jest.fn(),
  updateCourse: jest.fn(),
  deleteCourse: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
};

const mockAdminApi = {
  getRoles: jest.fn(),
  getUsers: jest.fn(),
  updateUser: jest.fn(),
};

jest.mock('../../api/client', () => ({
  apiClient: mockApiClient,
  adminApi: mockAdminApi,
}));

jest.mock('../../context/AuthContext');
const mockedUseAuth = useAuth as jest.Mock;

const teachers = [
  {
    id: 1,
    name: 'Ada Lovelace',
    department: 'Mathematics',
    average_rating: 4.5,
    review_count: 2,
    created_at: '2024-01-01T00:00:00Z',
    courses: [],
  },
];

const courses = [
  { id: 10, name: 'Analytical Machines', teacher_id: 1, created_at: '2024-01-02T00:00:00Z' },
];

const reviews = [
  {
    id: 100,
    teacher_id: 1,
    course_id: 10,
    rating: 5,
    description: 'Outstanding guidance.',
    created_at: '2024-01-03T00:00:00Z',
  },
];

const roles = [
  { id: 1, name: 'admin', description: '', created_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'editor', description: '', created_at: '2024-01-01T00:00:00Z' },
  { id: 3, name: 'viewer', description: '', created_at: '2024-01-01T00:00:00Z' },
];

const users = [
  {
    id: 1,
    email: 'admin@example.com',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    roles: [{ id: 1, name: 'admin', description: '', created_at: '2024-01-01T00:00:00Z' }],
  },
  {
    id: 2,
    email: 'editor@example.com',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    roles: [{ id: 3, name: 'viewer', description: '', created_at: '2024-01-01T00:00:00Z' }],
  },
];

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({ user: { email: 'admin@example.com' } });

    mockApiClient.getTeachers.mockResolvedValue({ data: teachers });
    mockApiClient.getCourses.mockResolvedValue({ data: courses });
    mockApiClient.getReviews.mockResolvedValue({ data: reviews });
    mockAdminApi.getRoles.mockResolvedValue({ data: roles });
    mockAdminApi.getUsers.mockResolvedValue({ data: users });
    mockAdminApi.updateUser.mockResolvedValue({
      data: { ...users[1], is_active: false, roles: [{ id: 2, name: 'editor' }] },
    });
    mockApiClient.deleteTeacher.mockResolvedValue({});
    window.confirm = jest.fn(() => true);
  });

  const renderDashboard = () => render(<AdminDashboard />);

  it('loads dashboard data and switches between tabs', async () => {
    renderDashboard();

    expect(screen.getByText(/Loading admin data/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
    expect(mockApiClient.getTeachers).toHaveBeenCalled();
    expect(mockAdminApi.getUsers).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Courses/i }));
    expect(screen.getByText('Analytical Machines')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Reviews/i }));
    expect(screen.getByText(/Outstanding guidance/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Users & Roles/i }));
    expect(screen.getByText('editor@example.com')).toBeInTheDocument();
  });

  it('allows updating user roles and status', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('editor@example.com')).toBeInTheDocument());

    const userRow = screen.getByText('editor@example.com').closest('tr');
    expect(userRow).not.toBeNull();
    const row = userRow as HTMLElement;

    const viewerCheckbox = within(row).getByLabelText('viewer') as HTMLInputElement;
    expect(viewerCheckbox.checked).toBe(true);
    await userEvent.click(viewerCheckbox);

    const editorCheckbox = within(row).getByLabelText('editor') as HTMLInputElement;
    await userEvent.click(editorCheckbox);

    const statusToggle = within(row).getByRole('checkbox', { name: /Active/i }) as HTMLInputElement;
    await userEvent.click(statusToggle);

    await userEvent.click(within(row).getByRole('button', { name: /Save/i }));

    await waitFor(() =>
      expect(mockAdminApi.updateUser).toHaveBeenCalledWith(2, {
        role_names: ['editor'],
        is_active: false,
      }),
    );
  });

  it('deletes a teacher after confirmation', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => expect(mockApiClient.deleteTeacher).toHaveBeenCalledWith(1));
  });
});
