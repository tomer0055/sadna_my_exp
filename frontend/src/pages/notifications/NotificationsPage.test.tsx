import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import NotificationsPage from './NotificationsPage';
import { NotificationAPI } from '../../api/notificationsApi';

vi.mock('../../api/notificationsApi', () => ({
  NotificationAPI: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn()
  }
}));

const mockNotifications = [
  { id: 'n1', title: 'Order Confirmed', message: 'Your order was confirmed.', read: false, createdAt: '2027-01-15T10:00:00' },
  { id: 'n2', title: 'Event Reminder', message: 'Rock Festival is tomorrow!', read: true, createdAt: '2027-01-14T08:00:00' },
  { id: 'n3', title: '', message: 'System maintenance scheduled.', read: false, createdAt: '2027-01-13T12:00:00' }
];

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // Loading state
  it('GivenPageIsLoading_WhenRendered_ThenDisplaysLoadingIndicator', () => {
    (NotificationAPI.getNotifications as any).mockReturnValue(new Promise(() => {}));

    render(<NotificationsPage />);

    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

  // Display notifications
  it('GivenNotifications_WhenPageLoads_ThenDisplaysNotificationList', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue(mockNotifications);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Event Reminder')).toBeInTheDocument();
    });
    expect(screen.getByText('Your order was confirmed.')).toBeInTheDocument();
    expect(screen.getByText('Rock Festival is tomorrow!')).toBeInTheDocument();
  });

  // Empty state
  it('GivenNoNotifications_WhenPageLoads_ThenDisplaysEmptyState', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue([]);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
      expect(screen.getByText(/There are no new notifications/)).toBeInTheDocument();
    });
  });

  // Fallback title for notifications without title
  it('GivenNotificationWithoutTitle_WhenRendered_ThenDisplaysSystemNotification', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue([mockNotifications[2]]);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('System Notification')).toBeInTheDocument();
      expect(screen.getByText('System maintenance scheduled.')).toBeInTheDocument();
    });
  });

  // Inbox heading
  it('GivenNotificationsPage_WhenRendered_ThenDisplaysInboxHeading', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue([]);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Inbox')).toBeInTheDocument();
    });
  });

  // Filter tabs
  it('GivenFilterTabs_WhenUnreadClicked_ThenShowsOnlyUnreadNotifications', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue(mockNotifications);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Unread'));

    expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    expect(screen.queryByText('Event Reminder')).not.toBeInTheDocument();
  });

  // Unread filter empty state
  it('GivenAllNotificationsRead_WhenUnreadFilterActive_ThenShowsEmptyMessage', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue([
      { ...mockNotifications[1] }
    ]);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Event Reminder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Unread'));

    await waitFor(() => {
      expect(screen.getByText(/There are no unread notifications/)).toBeInTheDocument();
    });
  });

  // Mark all as read
  it('GivenUnreadNotifications_WhenMarkAllAsReadClicked_ThenCallsApiForEachUnread', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue(mockNotifications);
    (NotificationAPI.markAsRead as any).mockResolvedValue(undefined);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark all as read'));

    await waitFor(() => {
      expect(NotificationAPI.markAsRead).toHaveBeenCalledWith('n1');
      expect(NotificationAPI.markAsRead).toHaveBeenCalledWith('n3');
      expect(NotificationAPI.markAsRead).toHaveBeenCalledTimes(2);
    });
  });

  // Mark single as read — optimistic update
  it('GivenUnreadNotification_WhenMarkAsReadClicked_ThenCallsApi', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue([mockNotifications[0]]);
    (NotificationAPI.markAsRead as any).mockResolvedValue(undefined);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    });

    const markButton = screen.getByTitle('Mark as read');
    fireEvent.click(markButton);

    await waitFor(() => {
      expect(NotificationAPI.markAsRead).toHaveBeenCalledWith('n1');
    });
  });

  // Revert on API failure
  it('GivenMarkAsReadFails_WhenApiRejects_ThenRevertsNotificationToUnread', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue([mockNotifications[0]]);
    (NotificationAPI.markAsRead as any).mockRejectedValue(new Error('API Error'));

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
    });

    const markButton = screen.getByTitle('Mark as read');
    fireEvent.click(markButton);

    await waitFor(() => {
      expect(NotificationAPI.markAsRead).toHaveBeenCalledWith('n1');
    });

    // After API failure, the mark-as-read button should reappear
    await waitFor(() => {
      expect(screen.getByTitle('Mark as read')).toBeInTheDocument();
    });
  });
});
