import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewForm from '../ReviewForm';
import { apiClient } from '../../api/client';

jest.mock('../../api/client', () => ({
  apiClient: {
    createReview: jest.fn(),
  },
}));

const mockedCreateReview = apiClient.createReview as jest.Mock;

const teacher = {
  id: 1,
  name: 'Test Teacher',
  department: 'Testing',
  created_at: '2024-01-01',
  courses: [
    { id: 10, name: 'Quality Assurance', teacher_id: 1, created_at: '2024-01-01' },
    { id: 20, name: 'Unit Testing 101', teacher_id: 1, created_at: '2024-01-01' },
  ],
};

describe('ReviewForm', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('validates required inputs before submission', async () => {
    const onSubmit = jest.fn();
    render(<ReviewForm teacher={teacher} onSubmit={onSubmit} onCancel={jest.fn()} />);

    await userEvent.click(screen.getByText('Submit Review'));
    expect(screen.getByText(/Please select a rating/i)).toBeInTheDocument();

    await userEvent.click(screen.getAllByText('★')[4]);
    await userEvent.click(screen.getByText('Submit Review'));
    expect(screen.getByText(/Please select a course/i)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/Course/i), ['10']);
    await userEvent.click(screen.getByText('Submit Review'));
    expect(screen.getByText(/Description must be at least 10 characters/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a review when inputs are valid', async () => {
    const onSubmit = jest.fn();
    mockedCreateReview.mockResolvedValue({ data: {} });

    render(<ReviewForm teacher={teacher} onSubmit={onSubmit} onCancel={jest.fn()} />);

    await userEvent.click(screen.getAllByText('★')[3]);
    await userEvent.selectOptions(screen.getByLabelText(/Course/i), ['20']);
    await userEvent.type(screen.getByLabelText(/Description/i), 'Excellent explanations!');

    await userEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => expect(mockedCreateReview).toHaveBeenCalled());
    expect(mockedCreateReview).toHaveBeenCalledWith({
      teacher_id: 1,
      course_id: 20,
      rating: 4,
      description: 'Excellent explanations!',
    });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('displays server errors returned by the API', async () => {
    mockedCreateReview.mockRejectedValue({
      response: { status: 401 },
    });

    render(<ReviewForm teacher={teacher} onSubmit={jest.fn()} onCancel={jest.fn()} />);

    await userEvent.click(screen.getAllByText('★')[0]);
    await userEvent.selectOptions(screen.getByLabelText(/Course/i), ['10']);
    await userEvent.type(screen.getByLabelText(/Description/i), 'Great course!');

    await userEvent.click(screen.getByText('Submit Review'));

    await waitFor(() =>
      expect(screen.getByText(/Your session has expired/i)).toBeInTheDocument(),
    );
  });
});
