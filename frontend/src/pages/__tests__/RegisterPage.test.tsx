import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../RegisterPage';
import { useAuth } from '../../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../context/AuthContext');
const mockedUseAuth = useAuth as jest.Mock;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = () =>
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

  const fillForm = async () => {
    await userEvent.type(screen.getByLabelText(/^Email/), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'Password123!');
    await userEvent.type(screen.getByLabelText(/Confirm Password/), 'Password123!');
  };

  it('blocks submission when passwords do not match', async () => {
    mockedUseAuth.mockReturnValue({ register: jest.fn() });
    renderWithRouter();
    await userEvent.type(screen.getByLabelText(/^Email/), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), 'Password123!');
    await userEvent.type(screen.getByLabelText(/Confirm Password/), 'Mismatch123!');
    await userEvent.click(screen.getByRole('button', { name: /Register/i }));

    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it('registers a new user and navigates home', async () => {
    const register = jest.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ register });

    renderWithRouter();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({ email: 'user@example.com', password: 'Password123!' }),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('displays errors from the server', async () => {
    const register = jest.fn().mockRejectedValue({
      response: { data: { detail: 'Email already in use' } },
    });
    mockedUseAuth.mockReturnValue({ register });

    renderWithRouter();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() =>
      expect(screen.getByText(/Email already in use/i)).toBeInTheDocument(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
