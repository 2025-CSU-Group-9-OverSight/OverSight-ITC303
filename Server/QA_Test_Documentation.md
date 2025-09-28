# OverSight Monitoring System - Quality Assurance Test Documentation

**Document Version:** 1.0  
**Date:** September 28, 2025  
**System:** OverSight ITC303 Live Monitoring and Reporting System   

---

## Table of Contents

1. [Test Overview](#test-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Authentication & Security Tests](#authentication--security-tests)
4. [Core Monitoring Functionality Tests](#core-monitoring-functionality-tests)
5. [Alert System Tests](#alert-system-tests)
6. [User Interface Tests](#user-interface-tests)
7. [Performance Tests](#performance-tests)
8. [Integration Tests](#integration-tests)
9. [Regression Tests](#regression-tests)
10. [Test Execution Checklist](#test-execution-checklist)
11. [Bug Reporting Template](#bug-reporting-template)

---

## Test Overview

### Purpose
This document outlines comprehensive testing procedures for the OverSight monitoring system to ensure reliability, security, and user experience quality.

### Scope
- Authentication and authorization
- Real-time monitoring functionality
- Alert generation and management
- User interface responsiveness
- Data persistence and retrieval
- WebSocket communication
- Profile management

### Test Objectives
- Verify all core features function as expected
- Ensure system security and data protection
- Validate user experience across different scenarios
- Confirm system performance under various loads
- Identify and document any defects or issues

---

## Test Environment Setup

### Prerequisites
- [ ] MongoDB database running and accessible
- [ ] Next.js server running on localhost:3000
- [ ] Python monitoring script configured and running
- [ ] Web browser (Chrome, Firefox, or Edge)
- [ ] Test user accounts (Admin and Standard user)
- [ ] Sample monitoring data available

### Test Data Requirements
- [ ] At least 2 test devices with monitoring data
- [ ] Historical alert data (acknowledged and unacknowledged)
- [ ] Sample profile pictures for upload testing
- [ ] Various system load scenarios for performance testing

---

## Authentication & Security Tests

### Test Case AUTH-001: User Login
**Objective:** Verify user authentication functionality

**Preconditions:**
- Server is running
- Valid user credentials exist in database

**Test Steps:**
1. Navigate to `http://localhost:3000/login`
2. Enter valid admin credentials (admin@gmail.com / admin123)
3. Click "Login" button
4. Verify redirect to dashboard
5. Verify user information displayed in sidebar

**Expected Results:**
- [ ] Login successful
- [ ] Redirect to dashboard occurs
- [ ] User email and role displayed in sidebar
- [ ] No error messages displayed

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case AUTH-002: Invalid Login
**Objective:** Verify system rejects invalid credentials

**Test Steps:**
1. Navigate to login page
2. Enter invalid credentials (wrong email/password)
3. Click "Login" button

**Expected Results:**
- [ ] Login fails
- [ ] Error message displayed
- [ ] User remains on login page
- [ ] No redirect occurs

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case AUTH-003: Session Management
**Objective:** Verify session persistence and timeout

**Test Steps:**
1. Login with valid credentials
2. Navigate between different pages
3. Leave browser idle for 30 minutes
4. Attempt to access protected page

**Expected Results:**
- [ ] Session persists during navigation
- [ ] Session expires after timeout
- [ ] Redirect to login page when session expires

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case AUTH-004: WebSocket Authentication
**Objective:** Verify WebSocket connections require authentication

**Test Steps:**
1. Start monitoring script without valid token
2. Attempt to connect to WebSocket endpoint
3. Verify connection is rejected

**Expected Results:**
- [ ] Connection rejected with 401 error
- [ ] No data transmission occurs
- [ ] Error logged in server console

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Core Monitoring Functionality Tests

### Test Case MON-001: Live System Metrics Display
**Objective:** Verify real-time metrics are displayed correctly

**Preconditions:**
- Monitoring script is running
- WebSocket authentication is working

**Test Steps:**
1. Login to system
2. Navigate to Dashboard
3. Verify Live System Metrics section is visible
4. Check that metrics update in real-time
5. Verify CPU, Memory, and Disk usage are displayed

**Expected Results:**
- [ ] Metrics section displays correctly
- [ ] Data updates every 10 seconds
- [ ] CPU, Memory, Disk percentages shown
- [ ] No "Connection Closed" errors
- [ ] Charts/graphs render properly

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case MON-002: Machine Selection
**Objective:** Verify machine selection dropdown functionality

**Test Steps:**
1. Navigate to Dashboard
2. Locate machine selection dropdown
3. Select different machines from dropdown
4. Verify metrics update for selected machine
5. Select "All Machines" option

**Expected Results:**
- [ ] Dropdown populated with available machines
- [ ] Selection changes metrics display
- [ ] "All Machines" shows aggregated data
- [ ] Individual machine selection shows specific data

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case MON-003: Data Persistence
**Objective:** Verify monitoring data is stored in database

**Test Steps:**
1. Ensure monitoring script is running
2. Wait for data to be collected (5+ minutes)
3. Check database for performanceLog collection
4. Verify data contains expected fields
5. Check data timestamps are recent

**Expected Results:**
- [ ] Data exists in performanceLog collection
- [ ] Records contain device, CPU, RAM, disk data
- [ ] Timestamps are current and sequential
- [ ] Data structure matches expected schema

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Alert System Tests

### Test Case ALERT-001: Alert Generation
**Objective:** Verify alerts are generated when thresholds are exceeded

**Preconditions:**
- Alert thresholds are set (CPU: 85%, RAM: 80%, Disk: 95%)
- Monitoring script is running

**Test Steps:**
1. Navigate to Alerts page
2. Check current alert count
3. Simulate high system usage (if possible)
4. Wait for monitoring data to be processed
5. Check if new alerts are generated

**Expected Results:**
- [ ] Alerts page loads correctly
- [ ] Existing alerts are displayed
- [ ] New alerts generated when thresholds exceeded
- [ ] Alert details include device, type, and timestamp

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case ALERT-002: Alert Acknowledgment
**Objective:** Verify alert acknowledgment functionality

**Preconditions:**
- System is running with monitoring script
- Alert thresholds can be temporarily modified

**Test Steps:**
1. **Generate Test Alerts:**
   - Run: `npx tsx scripts/generate-test-alerts.ts generate`
   - Wait for test alerts to be generated (1-3 minutes)
   - Verify alerts appear on Alerts page

2. **Test Acknowledgment:**
   - Navigate to Alerts page
   - Locate unacknowledged alert
   - Click "Acknowledge" button
   - Verify alert status changes
   - Refresh page and verify status persists

3. **Cleanup:**
   - Run: `npx tsx scripts/generate-test-alerts.ts cleanup`
   - Verify original thresholds are restored
   - Verify test alerts are removed

**Expected Results:**
- [ ] Test alerts are generated successfully
- [ ] Acknowledge button is clickable
- [ ] Alert status changes to "Acknowledged"
- [ ] Status persists after page refresh
- [ ] Cleanup completes successfully
- [ ] Original thresholds are restored

**Pass/Fail:** ☐ Pass ☐ Fail

**Notes:**
- If no test alerts are generated, check monitoring script status
- Always run cleanup when testing is complete
- Test script automatically backs up and restores original thresholds

---

### Test Case ALERT-003: Hysteresis Logic Validation
**Objective:** Verify hysteresis logic prevents alert spam and handles state transitions correctly

**Preconditions:**
- System is running with monitoring script
- Alert thresholds are set to realistic values

**Test Steps:**
1. **Test CPU Hysteresis:**
   - Run: `npx tsx scripts/test-hysteresis-logic.ts cpu`
   - Verify all CPU test scenarios pass
   - Check that alert spam prevention works

2. **Test RAM Hysteresis:**
   - Run: `npx tsx scripts/test-hysteresis-logic.ts ram`
   - Verify all RAM test scenarios pass
   - Check that alert spam prevention works

3. **Test Disk Hysteresis:**
   - Run: `npx tsx scripts/test-hysteresis-logic.ts disk`
   - Verify all Disk test scenarios pass
   - Check that alert spam prevention works

4. **Test All Types:**
   - Run: `npx tsx scripts/test-hysteresis-logic.ts all`
   - Verify comprehensive test results

**Expected Results:**
- [ ] CPU hysteresis logic works correctly
- [ ] RAM hysteresis logic works correctly
- [ ] Disk hysteresis logic works correctly
- [ ] Alert spam prevention functions properly
- [ ] State transitions (normal ↔ alerting) work correctly
- [ ] Clear thresholds are respected
- [ ] All test scenarios pass

**Pass/Fail:** ☐ Pass ☐ Fail

**Notes:**
- This test simulates the logic in websocketDb.ts
- For real-world testing, use generate-test-alerts.ts script
- Hysteresis prevents minor fluctuations from creating alert spam
- Clear thresholds should be lower than alert thresholds

---

### Test Case ALERT-004: Alert Filtering
**Objective:** Verify alert filtering and pagination

**Test Steps:**
1. Navigate to Alerts page
2. Test status filter (All, Unacknowledged, Acknowledged)
3. Test time filter (24 hours, 7 days, 30 days, All time)
4. Test pagination controls
5. Test bulk actions

**Expected Results:**
- [ ] Status filter works correctly
- [ ] Time filter updates alert list
- [ ] Pagination controls function properly
- [ ] Bulk actions work as expected
- [ ] Quick filter buttons work

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case ALERT-004: Hysteresis Logic
**Objective:** Verify alert spam prevention

**Preconditions:**
- System is generating alerts
- Hysteresis thresholds are set

**Test Steps:**
1. Monitor alert generation over time
2. Verify no duplicate alerts for same issue
3. Check that alerts only generate on state transitions
4. Verify clear thresholds work correctly

**Expected Results:**
- [ ] No duplicate alerts for same device/type
- [ ] Alerts only generate when crossing thresholds
- [ ] System resets to normal state when usage drops
- [ ] No alert spam from minor fluctuations

**Pass/Fail:** ☐ Pass ☐ Fail

---

## User Interface Tests

### Test Case UI-001: Responsive Design
**Objective:** Verify UI works on different screen sizes

**Test Steps:**
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)
4. Verify all elements are visible and functional
5. Check that navigation works on all sizes

**Expected Results:**
- [ ] Layout adapts to screen size
- [ ] All buttons and links are clickable
- [ ] Text is readable on all devices
- [ ] Navigation remains functional
- [ ] No horizontal scrolling required

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case UI-002: Navigation
**Objective:** Verify navigation between pages

**Test Steps:**
1. Login to system
2. Navigate to each main page (Dashboard, Alerts, Processes, Settings)
3. Verify page titles and content load correctly
4. Test back/forward browser navigation
5. Verify active page highlighting in sidebar

**Expected Results:**
- [ ] All pages load correctly
- [ ] Page titles are accurate
- [ ] Content displays properly
- [ ] Active page is highlighted
- [ ] Browser navigation works

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case UI-003: Profile Picture Upload
**Objective:** Verify profile picture functionality

**Test Steps:**
1. Navigate to Settings page
2. Click "Upload" button for profile picture
3. Select a valid image file
4. Verify upload completes successfully
5. Check that picture appears in sidebar
6. Test "Remove" functionality

**Expected Results:**
- [ ] Upload button opens file dialog
- [ ] Valid image files are accepted
- [ ] Upload completes without errors
- [ ] Picture displays in sidebar
- [ ] Remove button works correctly

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Performance Tests

### Test Case PERF-001: Load Time
**Objective:** Verify system loads within acceptable time

**Test Steps:**
1. Clear browser cache
2. Navigate to login page
3. Measure time to load
4. Login and measure dashboard load time
5. Navigate to each page and measure load times

**Expected Results:**
- [ ] Login page loads within 3 seconds
- [ ] Dashboard loads within 5 seconds
- [ ] Other pages load within 3 seconds
- [ ] No timeout errors

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case PERF-002: Real-time Updates
**Objective:** Verify real-time data updates don't impact performance

**Test Steps:**
1. Monitor system for 30 minutes
2. Check browser memory usage
3. Verify no memory leaks
4. Check that updates don't cause UI freezing
5. Monitor server resource usage

**Expected Results:**
- [ ] Memory usage remains stable
- [ ] UI remains responsive
- [ ] No browser crashes
- [ ] Server resources remain stable
- [ ] Updates continue smoothly

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Integration Tests

### Test Case INT-001: End-to-End Monitoring
**Objective:** Verify complete monitoring workflow

**Test Steps:**
1. Start monitoring script
2. Login to web interface
3. Verify data appears in dashboard
4. Check that alerts are generated
5. Test alert acknowledgment
6. Verify data persistence

**Expected Results:**
- [ ] Complete workflow functions correctly
- [ ] Data flows from script to UI
- [ ] Alerts are generated and manageable
- [ ] All components work together

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test Case INT-002: Multi-User Access
**Objective:** Verify system works with multiple users

**Test Steps:**
1. Login as admin user
2. Open second browser/incognito window
3. Login as standard user
4. Verify both users can access system
5. Check that data is consistent between users

**Expected Results:**
- [ ] Multiple users can login simultaneously
- [ ] Data is consistent across users
- [ ] No conflicts or errors
- [ ] Each user sees appropriate interface

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Regression Tests

### Test Case REG-001: Core Functionality
**Objective:** Verify core features still work after changes

**Test Steps:**
1. Run all core monitoring tests
2. Run authentication tests
3. Run alert system tests
4. Verify no new issues introduced

**Expected Results:**
- [ ] All previously working features still work
- [ ] No new bugs introduced
- [ ] Performance remains acceptable
- [ ] UI remains functional

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Test environment is ready
- [ ] All prerequisites are met
- [ ] Test data is available
- [ ] Monitoring script is running
- [ ] Server is running and accessible

### Test Execution
- [ ] Authentication tests completed
- [ ] Core monitoring tests completed
- [ ] Alert system tests completed
- [ ] UI tests completed
- [ ] Performance tests completed
- [ ] Integration tests completed
- [ ] Regression tests completed

### Post-Test
- [ ] All test results documented
- [ ] Bugs reported and tracked
- [ ] Test environment cleaned up
- [ ] Results reviewed with team

---

## Bug Reporting Template

### Bug Report #: [NUMBER]
**Date:** [DATE]  
**Reporter:** [NAME]  
**Severity:** [Critical/High/Medium/Low]  
**Priority:** [High/Medium/Low]  

### Description
[Brief description of the issue]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Environment
- Browser: [Browser and version]
- OS: [Operating system]
- Screen Resolution: [Resolution]
- User Role: [Admin/Standard]

### Screenshots/Logs
[Attach relevant screenshots or log files]

### Additional Notes
[Any additional information]

---

## Test Sign-off

**Test Execution Date:** _______________  
**Tested By:** _______________  
**Approved By:** _______________  
**Comments:** _______________  

---

*This document should be updated as new features are added or existing functionality is modified.*
