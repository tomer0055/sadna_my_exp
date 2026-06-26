import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('../../api/notificationsApi', () => ({
  NotificationAPI: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
  },
  NotificationDTO: {},
}));

import NotificationsPage from './NotificationsPage';
import { NotificationAPI } from '../../api/notificationsApi';

describe('NotificationsPage – error & crash resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('GivenApiFails_WhenLoadingNotifications_ThenStopsLoadingAndShowsEmptyState', async () => {
    (NotificationAPI.getNotifications as any).mockRejectedValue(new Error('Network error'));
    render(<NotificationsPage />);

    await waitFor(() => expect(screen.queryByText('Loading notifications...')).not.toBeInTheDocument());
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
  });

  it('GivenApiReturnsNull_WhenLoadingNotifications_ThenPageDoesNotCrash', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue(null);
    expect(() => render(<NotificationsPage />)).not.toThrow();
  });

  it('GivenApiReturnsEmptyArray_WhenLoadingNotifications_ThenShowsEmptyMessage', async () => {
    (NotificationAPI.getNotifications as any).mockResolvedValue([]);
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText("You're all caught up!")).toBeInTheDocument());
  });

  it('GivenMarkAsReadFails_WhenClicking_ThenRollsBackOptimisticUpdate', async () => {
    const notifications = [
      { id: 'n1', title: 'Test Notification', message: 'Hello', read: false, createdAt: new Date().toISOString() },
    ];
    (NotificationAPI.getNotifications as any).mockResolvedValue(notifications);
    (NotificationAPI.markAsRead as any).mockRejectedValue(new Error('Server error'));
    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText('Test Notification')).toBeInTheDocument());

    const markBtn = screen.getByTitle('Mark as read');
    fireEvent.click(markBtn);

    await waitFor(() => {
      expect(screen.getByTitle('Mark as read')).toBeInTheDocument();
    });
  });

  it('GivenMarkAllAsReadPartiallyFails_WhenClicking_ThenDoesNotCrash', async () => {
    const notifications = [
      { id: 'n1', title: 'Notif 1', message: 'Msg 1', read: false, createdAt: new Date().toISOString() },
      { id: 'n2', title: 'Notif 2', message: 'Msg 2', read: false, createdAt: new Date().toISOString() },
    ];
    (NotificationAPI.getNotifications as any).mockResolvedValue(notifications);
    (NotificationAPI.markAsRead as any)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Partial fail'));
    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText('Notif 1')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Mark all as read'));

    await waitFor(() => {
      expect(screen.getByText('Notif 1')).toBeInTheDocument();
      expect(screen.getByText('Notif 2')).toBeInTheDocument();
    });
  });

  it('GivenNoToken_WhenMarkingAsRead_ThenDoesNotCallApi', async () => {
    localStorage.removeItem('token');
    const notifications = [
      { id: 'n1', title: 'Test', message: 'Msg', read: false, createdAt: new Date().toISOString() },
    ];
    (NotificationAPI.getNotifications as any).mockResolvedValue(notifications);
    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Mark as read'));
    expect(NotificationAPI.markAsRead).not.toHaveBeenCalled();
  });

  it('GivenNotificationMissingTitle_WhenRendered_ThenShowsFallbackTitle', async () => {
    const notifications = [
      { id: 'n1', title: '', message: 'Some message', read: false, createdAt: new Date().toISOString() },
    ];
    (NotificationAPI.getNotifications as any).mockResolvedValue(notifications);
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText('System Notification')).toBeInTheDocument());
  });

  it('GivenNotificationWithInvalidDate_WhenRendered_ThenDoesNotCrash', async () => {
    const notifications = [
      { id: 'n1', title: 'Test', message: 'Msg', read: false, createdAt: 'invalid-date' },
    ];
    (NotificationAPI.getNotifications as any).mockResolvedValue(notifications);
    expect(() => render(<NotificationsPage />)).not.toThrow();
  });
});
