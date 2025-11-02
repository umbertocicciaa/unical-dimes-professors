import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewForm from '../ReviewForm';
import { apiClient } from '../../api/client';

jest.mock('../../api/client', () => ({
  apiClient: {
    moderateReview: jest.fn(),
    createReview: jest.fn(),
  },
}));

const mockedModerateReview = apiClient.moderateReview as jest.Mock;
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
    expect(mockedModerateReview).not.toHaveBeenCalled();
    expect(mockedCreateReview).not.toHaveBeenCalled();
  });

  it('submits a review when inputs are valid', async () => {
    const onSubmit = jest.fn();
    mockedModerateReview.mockResolvedValue({
      data: {
        allowed: true,
        blockedReasons: [],
        message: 'Looks good',
        scores: { SAFE: 1 },
        modelVersion: 'test-model',
      },
    });
    mockedCreateReview.mockResolvedValue({ data: {} });

    render(<ReviewForm teacher={teacher} onSubmit={onSubmit} onCancel={jest.fn()} />);

    await userEvent.click(screen.getAllByText('★')[3]);
    await userEvent.selectOptions(screen.getByLabelText(/Course/i), ['20']);
    await userEvent.type(screen.getByLabelText(/Description/i), 'Excellent explanations!');

    await userEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => expect(mockedModerateReview).toHaveBeenCalled());
    expect(mockedModerateReview).toHaveBeenCalledWith({
      teacher_id: 1,
      course_id: 20,
      text: 'Excellent explanations!',
      rating: 4,
    });
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
    mockedModerateReview.mockResolvedValue({
      data: {
        allowed: true,
        blockedReasons: [],
        message: 'Looks good',
        scores: { SAFE: 1 },
        modelVersion: 'test-model',
      },
    });
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

  it('shows moderation feedback when review is blocked', async () => {
    mockedModerateReview.mockResolvedValue({
      data: {
        allowed: false,
        blockedReasons: ['OFFENSIVE_LANGUAGE'],
        message: 'Please remove offensive language and focus on the teaching experience.',
        scores: { OFFENSIVE_LANGUAGE: 0.7 },
        modelVersion: 'test-model',
        suggestion: 'Focus on teaching quality.',
      },
    });

    render(<ReviewForm teacher={teacher} onSubmit={jest.fn()} onCancel={jest.fn()} />);

    await userEvent.click(screen.getAllByText('★')[3]);
    await userEvent.selectOptions(screen.getByLabelText(/Course/i), ['10']);
    await userEvent.type(screen.getByLabelText(/Description/i), 'This professor is awful.');

    await userEvent.click(screen.getByText('Submit Review'));

    await waitFor(() =>
      expect(screen.getByText(/Review needs edits/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/offensive language/i)).toBeInTheDocument();
    expect(mockedCreateReview).not.toHaveBeenCalled();
  });

  it('displays language guidance when moderation rejects unsupported language', async () => {
    mockedModerateReview.mockResolvedValue({
      data: {
        allowed: false,
        blockedReasons: ['UNSUPPORTED_LANGUAGE'],
        message: 'Reviews must be written in English or Italian.',
        scores: { UNSUPPORTED_LANGUAGE: 1 },
        modelVersion: 'test-model',
        suggestion: 'Please rewrite the review in English or Italian. Detected language: Spanish.',
      },
    });

    render(<ReviewForm teacher={teacher} onSubmit={jest.fn()} onCancel={jest.fn()} />);

    await userEvent.click(screen.getAllByText('★')[2]);
    await userEvent.selectOptions(screen.getByLabelText(/Course/i), ['20']);
    await userEvent.type(screen.getByLabelText(/Description/i), 'Este profesor explica muy bien.');

    await userEvent.click(screen.getByText('Submit Review'));

    await waitFor(() =>
      expect(screen.getByText(/Reviews must be written in English or Italian/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/unsupported language/i)).toBeInTheDocument();
    expect(mockedCreateReview).not.toHaveBeenCalled();
    expect(screen.queryByText(/Use suggestion/i)).not.toBeInTheDocument();
  });
});
