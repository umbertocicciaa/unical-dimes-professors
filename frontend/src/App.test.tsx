import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const mockUseAuth = jest.fn();

jest.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

describe('App routing and header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login links when no user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      logout: jest.fn(),
      hasRole: () => false,
    });

    render(<App />);

    expect(screen.getByText(/Professor Reviews/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Login/i)).toBeInTheDocument());
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
  });

  it('shows admin navigation and logout for privileged users', async () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: { email: 'admin@example.com', roles: [{ name: 'admin' }] },
      loading: false,
      logout,
      hasRole: (...roles: string[]) => roles.includes('admin'),
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText('admin@example.com')).toBeInTheDocument());
    expect(screen.getByText('Admin')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Logout/i }));
    expect(logout).toHaveBeenCalled();
  });
});
