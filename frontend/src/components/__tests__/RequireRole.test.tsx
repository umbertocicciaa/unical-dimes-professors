import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireRole from '../RequireRole';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../context/AuthContext');
const mockedUseAuth = useAuth as jest.Mock;

describe('RequireRole', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const renderWithRoutes = () =>
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={['admin']}>
                <div>Admin Portal</div>
              </RequireRole>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Homepage</div>} />
        </Routes>
      </MemoryRouter>,
    );

  it('shows a loading indicator while auth state resolves', () => {
    mockedUseAuth.mockReturnValue({ loading: true });
    renderWithRoutes();
    expect(screen.getByText(/Checking your session/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', async () => {
    mockedUseAuth.mockReturnValue({ loading: false, user: null, hasRole: () => false });
    renderWithRoutes();
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
  });

  it('redirects users without the required role', async () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      user: { email: 'user@example.com' },
      hasRole: () => false,
    });
    renderWithRoutes();
    await waitFor(() => expect(screen.getByText('Homepage')).toBeInTheDocument());
  });

  it('renders children when roles are satisfied', async () => {
    mockedUseAuth.mockReturnValue({
      loading: false,
      user: { email: 'admin@example.com' },
      hasRole: () => true,
    });
    renderWithRoutes();
    await waitFor(() => expect(screen.getByText('Admin Portal')).toBeInTheDocument());
  });
});
