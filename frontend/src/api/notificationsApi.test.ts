import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationAPI } from './notificationsApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('NotificationAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  // getNotifications
  it('GivenValidToken_WhenGetNotificationsCalled_ThenReturnsNotifications', async () => {
    const notifications = [{ id: 'n1', message: 'Hello', read: false, createdAt: '2027-01-01' }];
    mockFetch.mockReturnValue(jsonResponse(notifications));

    const result = await NotificationAPI.getNotifications();

    expect(result).toEqual(notifications);
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications', expect.objectContaining({ method: 'GET' }));
  });

  // getNotifications - error
  it('GivenServerError_WhenGetNotificationsCalled_ThenThrowsError', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 500));

    await expect(NotificationAPI.getNotifications()).rejects.toThrow('Failed to fetch notifications');
  });

  // getUnreadCount
  it('GivenValidToken_WhenGetUnreadCountCalled_ThenReturnsCount', async () => {
    mockFetch.mockReturnValue(jsonResponse(5));

    const result = await NotificationAPI.getUnreadCount();

    expect(result).toBe(5);
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/unread-count', expect.objectContaining({ method: 'GET' }));
  });

  // getNotificationById
  it('GivenNotificationId_WhenGetByIdCalled_ThenReturnsSingleNotification', async () => {
    const notification = { id: 'n1', message: 'Test', read: true, createdAt: '2027-01-01' };
    mockFetch.mockReturnValue(jsonResponse(notification));

    const result = await NotificationAPI.getNotificationById('n1');

    expect(result).toEqual(notification);
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/n1', expect.objectContaining({ method: 'GET' }));
  });

  // markAsRead
  it('GivenNotificationId_WhenMarkAsReadCalled_ThenReturnsTrueOnSuccess', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, true));

    const result = await NotificationAPI.markAsRead('n1');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/n1/read', expect.objectContaining({ method: 'PUT' }));
  });

  // markAsRead - error
  it('GivenServerError_WhenMarkAsReadCalled_ThenThrowsError', async () => {
    mockFetch.mockReturnValue(jsonResponse({}, false, 500));

    await expect(NotificationAPI.markAsRead('n1')).rejects.toThrow('Failed to mark as read');
  });

  // createNotification
  it('GivenNotificationData_WhenCreateCalled_ThenPostsNotification', async () => {
    const newNotification = { id: 'n2', message: 'New', read: false, createdAt: '2027-01-02' };
    mockFetch.mockReturnValue(jsonResponse(newNotification));

    const result = await NotificationAPI.createNotification({ targetUserId: 'u1', message: 'New' });

    expect(result).toEqual(newNotification);
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications', expect.objectContaining({ method: 'POST' }));
  });

  // Auth header uses token from localStorage
  it('GivenStoredToken_WhenAnyCalled_ThenSendsBearerHeader', async () => {
    mockFetch.mockReturnValue(jsonResponse([]));

    await NotificationAPI.getNotifications();

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer test-token');
  });
});
