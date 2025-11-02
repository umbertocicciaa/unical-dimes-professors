import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../LoginPage';
import { useAuth } from '../../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../context/AuthContext');
const mockedUseAuth = useAuth as jest.Mock;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = () =>
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

  it('submits credentials and navigates on success', async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ login });

    renderWithRouter();

    await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password123!',
    }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows an error message when login fails', async () => {
    const login = jest.fn().mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } },
    });
    mockedUseAuth.mockReturnValue({ login });

    renderWithRouter();

    await userEvent.type(screen.getByLabelText(/Email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() =>
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
