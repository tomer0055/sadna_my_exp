import { describe, it, expect } from 'vitest';
import { getUserFriendlyError } from './errorUtils';

describe('getUserFriendlyError', () => {
  // String input
  it('GivenStringError_WhenCalled_ThenReturnsTheString', () => {
    expect(getUserFriendlyError('Something went wrong')).toBe('Something went wrong');
  });

  // response.data.message
  it('GivenResponseDataMessage_WhenCalled_ThenExtractsMessage', () => {
    const error = { response: { data: { message: 'Invalid token' } } };
    expect(getUserFriendlyError(error)).toBe('Invalid token');
  });

  // response.data.error
  it('GivenResponseDataError_WhenCalled_ThenExtractsError', () => {
    const error = { response: { data: { error: 'Unauthorized access' } } };
    expect(getUserFriendlyError(error)).toBe('Unauthorized access');
  });

  // .message property
  it('GivenErrorWithMessage_WhenCalled_ThenExtractsMessage', () => {
    const error = new Error('Network timeout');
    expect(getUserFriendlyError(error)).toBe('Network timeout');
  });

  // .error property
  it('GivenObjectWithErrorProp_WhenCalled_ThenExtractsError', () => {
    const error = { error: 'Bad request' };
    expect(getUserFriendlyError(error)).toBe('Bad request');
  });

  // Strips Java exception prefix
  it('GivenJavaException_WhenCalled_ThenStripsPrefix', () => {
    expect(getUserFriendlyError('java.lang.IllegalArgumentException: Invalid email'))
      .toBe('Invalid email');
  });

  // Strips nested exception prefixes
  it('GivenNestedExceptionPrefixes_WhenCalled_ThenStripsAll', () => {
    expect(getUserFriendlyError('com.example.ServiceException: java.lang.RuntimeError: Something broke'))
      .toBe('Something broke');
  });

  // Empty/null/undefined
  it('GivenNullOrUndefined_WhenCalled_ThenReturnsEmptyString', () => {
    expect(getUserFriendlyError(null)).toBe('');
    expect(getUserFriendlyError(undefined)).toBe('');
  });

  // Empty object
  it('GivenEmptyObject_WhenCalled_ThenReturnsEmptyString', () => {
    expect(getUserFriendlyError({})).toBe('');
  });

  // Whitespace trimming
  it('GivenWhitespaceMessage_WhenCalled_ThenTrimsResult', () => {
    expect(getUserFriendlyError('  trimmed  ')).toBe('trimmed');
  });
});
