import { describe, it, expect } from 'vitest';
import { navItems } from './navItems';

describe('navItems', () => {
  it('GivenNavItems_WhenAccessed_ThenContainsSevenEntries', () => {
    expect(navItems).toHaveLength(7);
  });

  it('GivenNavItems_WhenChecked_ThenAllHaveRequiredFields', () => {
    navItems.forEach(item => {
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('path');
      expect(item).toHaveProperty('visibility');
      expect(item.path).toMatch(/^\//);
    });
  });

  it('GivenNavItems_WhenFiltered_ThenThreeAreVisibleToAll', () => {
    const publicItems = navItems.filter(i => i.visibility === 'all');
    expect(publicItems).toHaveLength(3);
    expect(publicItems.map(i => i.label)).toEqual(['Home', 'Events', 'Active Order']);
  });

  it('GivenNavItems_WhenFiltered_ThenThreeAreMemberOnly', () => {
    const memberItems = navItems.filter(i => i.visibility === 'member');
    expect(memberItems).toHaveLength(3);
    expect(memberItems.map(i => i.label)).toEqual(['Order History', 'Notifications', 'My Companies']);
  });

  it('GivenNavItems_WhenFiltered_ThenOneIsAdminOnly', () => {
    const adminItems = navItems.filter(i => i.visibility === 'admin');
    expect(adminItems).toHaveLength(1);
    expect(adminItems[0].label).toBe('Admin');
    expect(adminItems[0].path).toBe('/admin');
  });
});
