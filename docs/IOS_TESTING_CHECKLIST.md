# iOS Testing Checklist - DooCoins Parent & Kids Apps

## Pre-Testing Setup

- [ ] Run `./test-ios.sh` to build and sync parent app
- [ ] Run `./test-ios-kids.sh` to build and sync kids app (if available)
- [ ] Open both apps in Xcode
- [ ] Build and install both apps on device(s)
- [ ] Ensure device(s) has internet connection

---

## Testing Flow

### Part 1: Parent App - Initial Setup & Authentication

- [ ] Login via Internet Identity
- [ ] Successfully authenticate and reach dashboard
- [ ] Close app (don't logout)
- [ ] Open app to check persistence
- [ ] Verify data loads correctly after reopen

### Part 2: Parent App - Child Management

- [ ] Add a child (verify empty state if first child)
- [ ] Open child wallet
- [ ] Check messaging (if applicable)

### Part 3: Parent App - Tasks Management

- [ ] Navigate to tasks
- [ ] Create some tasks (test creating multiple)
- [ ] Edit a task
- [ ] Delete a task
- [ ] Approve some tasks
- [ ] Check balance updates after task approval

### Part 4: Parent App - Verify Transactions

- [ ] Navigate to wallet
- [ ] Verify approved tasks appear in transactions list
- [ ] Verify correct DooCoin amounts
- [ ] Verify transaction types and timestamps

### Part 5: Parent App - Rewards Management

- [ ] Navigate to rewards
- [ ] Create some rewards (test creating multiple)
- [ ] Edit a reward
- [ ] Delete a reward

### Part 6: Parent App - Goals Management

- [ ] Set a goal (from rewards list)
- [ ] Verify balance card updates with new goal
- [ ] Change the goal in the balance card
- [ ] Verify goal change syncs to rewards list
- [ ] Approve some tasks to reach goal balance

### Part 7: Parent App - Goal Completion

- [ ] Verify the actions popup on the reward shows "Claim Goal"
- [ ] On the balance card, click "Claim Goal"
- [ ] Verify the balance updates (DooCoins deducted)
- [ ] Verify the transaction is added to transactions list

### Part 8: Parent App - Navigation Check

- [ ] On the slide out menu, navigate to dashboard
- [ ] Verify the child balance is as expected
- [ ] Click on the child actions menu, select "View Child" to navigate back to child wallet
- [ ] Open the actions menu on the child card, select "Edit Name"
- [ ] Edit the child name
- [ ] Verify name updates everywhere

### Part 9: Parent App - Invite Child Flow

- [ ] Open the actions menu on the child card, select "Invite Child"
- [ ] Verify QR code displays
- [ ] Click the back arrow on the invite screen to go back to dashboard
- [ ] Open the actions menu again and select "Invite Child" (to prepare for kids app)

### Part 10: Kids App - Initial Setup

- [ ] Go to the kids app
- [ ] Enter magic code (scan QR when feature implemented)
- [ ] Verify login successful

### Part 11: Kids App - Data Consistency Check

- [ ] Verify balance card matches parent app
- [ ] Verify transactions list matches parent app
- [ ] Verify tasks list matches parent app
- [ ] Verify rewards list matches parent app
- [ ] Verify current goal matches parent app
- [ ] Close and open the app
- [ ] Verify data persists after reopen

### Part 12: Kids App - Goal Management

- [ ] Change goal on balance card
- [ ] Verify goal updates in rewards list
- [ ] Remove the goal on the rewards list
- [ ] Verify goal removed from balance card
- [ ] Change goal on rewards list
- [ ] Verify goal updates on balance card

### Part 13: Kids App - Task Requests

- [ ] Tick off some tasks (multiple)
- [ ] Verify tasks submitted for approval
- [ ] Verify visual feedback (status change)

### Part 14: Parent App - Request Handling

- [ ] Verify goal change from kids app matches in parent app
- [ ] Navigate to requests screen
- [ ] Verify task requests from kids app appear
- [ ] Decline a request
- [ ] Verify declined request status/removal
- [ ] Approve multiple tasks
- [ ] Verify balance updates after approval

### Part 15: Kids App - Verify Approvals

- [ ] Verify approved tasks are added to transactions list
- [ ] Verify balance updated with approved task amounts
- [ ] If there are enough DooCoins, click "Claim Goal" on balance card
  - [ ] If not enough, approve more tasks in parent app first
- [ ] Verify the goal button label changes to "Waiting for Approval"

### Part 16: Parent App - Goal Claim Approval

- [ ] Navigate to requests screen
- [ ] Verify goal claim request appears
- [ ] Approve the claim goal request
- [ ] Verify the balance updates (DooCoins deducted)
- [ ] Verify the goal is reset/cleared
- [ ] Verify the transactions list updates with redemption

### Part 17: Kids App - Goal Claim Verification

- [ ] Verify the balance updates (DooCoins deducted)
- [ ] Verify the goal is reset/cleared
- [ ] Verify the transactions list updates with redemption
- [ ] Logout from kids app
- [ ] Verify logout successful

### Part 18: Parent App - Child Cleanup

- [ ] Rename child (test name changes sync)
- [ ] Delete child (with confirmation)
- [ ] Verify child removed from dashboard
- [ ] Logout from parent app
- [ ] Close app
- [ ] Open app
- [ ] Verify still logged out (no session persistence after logout)

---

## Part 19: Parent App - Child Sharing Feature

### Parent App (Parent A) - Share Child

- [ ] Navigate to child list
- [ ] Click on child's three-dot menu
- [ ] Click "Share [child name]"
- [ ] Click "Copy Code" button
- [ ] Verify toast notification: "Code copied to clipboard"
- [ ] Verify code is actually copied to clipboard

### Parent App (Parent B) - Accept Shared Child

- [ ] Login to Account B
- [ ] Click "+" button to add child
- [ ] Check "Enter Magic Code"
- [ ] Enter the 4-digit code from Account A
- [ ] Click "Add Child" button
- [ ] Verify toast notification: "[Child name] has been shared with you"
- [ ] Verify child appears in Account B's child list with 👥 icon
- [ ] Verify limited menu options in actions menu (View, Remove only)
- [ ] Verify actions menu hidden on balance card

### Parent App (Parent A) - Revoke Shares

- [ ] Verify 👥 shared icon displays next to child name
- [ ] Verify all menu options in actions menu (Share, Invite, Rename, Delete, Revoke)
- [ ] Click "Revoke all shares"
- [ ] Verify confirmation dialog
- [ ] Click "Revoke"
- [ ] Verify toast: "Shares revoked" with success message
- [ ] Verify 👥 icon disappears from child
- [ ] Share a second child (repeat share process)

### Parent App (Parent B) - Remove Shared Child

- [ ] Verify first shared child no longer appears in list
- [ ] Click "Remove [child name]" in actions menu for second shared child
- [ ] Verify confirmation dialog shows: "This will remove [child name] from your child list. The child will still exist in the creator's account."
- [ ] Click "Remove"
- [ ] Verify toast: "Child removed" message
- [ ] Verify child disappears from Account B's list

### Parent App (Parent A) - Verify After Remove

- [ ] Verify second shared child still exists in list
- [ ] Verify 👥 icon removed (no longer shared)

---

## Additional Edge Cases to Test

### Multiple Children (If Time Permits)

- [ ] Add 2+ children
- [ ] Switch between children
- [ ] Verify data isolation (each child's data separate)
- [ ] Approve tasks for different children
- [ ] Verify balances update independently

### Error Handling

- [ ] Test with poor network connection
- [ ] Test with no network connection
- [ ] Verify error messages are helpful
- [ ] Verify app doesn't crash on network errors
- [ ] Test app recovery when connection restored

### Large Numbers

- [ ] Test with 1000+ DooCoins
- [ ] Verify display doesn't overflow
- [ ] Test with many tasks (10+)
- [ ] Test with many rewards (10+)
- [ ] Verify lists scroll properly

### Concurrent Usage

- [ ] Have both apps open simultaneously
- [ ] Make changes in parent while kids app open
- [ ] Verify kids app updates/refreshes
- [ ] Make request in kids app
- [ ] Quickly approve in parent app
- [ ] Verify no race conditions or duplicate entries

### Empty States

- [ ] Check parent app with no children
- [ ] Check child wallet with no tasks
- [ ] Check child wallet with no rewards
- [ ] Check transactions list with no transactions
- [ ] Verify helpful prompts/messages displayed

---

## Testing Notes

**Device Info:**

- Model: **\*\***\_\_\_\_**\*\***
- iOS Version: **\*\***\_\_\_\_**\*\***
- Build Number: **\*\***\_\_\_\_**\*\***

**Test Date:** **\*\***\_\_\_\_**\*\***

**Tester:** **\*\***\_\_\_\_**\*\***

**Overall Result:** ☐ Pass ☐ Fail ☐ Partial

**Critical Issues Found:**

1.
2.
3.

**Minor Issues Found:**

1.
2.
3.

**Additional Comments:**

- [ ] View all tasks for a child
- [ ] Create new task
  - [ ] Name field works
  - [ ] DooCoin reward amount can be set
  - [ ] Recurring options work (daily/weekly)
  - [ ] Task saves successfully
- [ ] Edit existing task
- [ ] Delete task (with confirmation)
- [ ] Mark task as complete/approve completion
- [ ] Task completion updates child's DooCoin balance

### Rewards Management

- [ ] View all rewards for a child
- [ ] Create new reward
  - [ ] Name field works
  - [ ] Target DooCoin amount can be set
  - [ ] Reward saves successfully
- [ ] Edit existing reward
- [ ] Delete reward
- [ ] Claim/redeem reward
- [ ] Reward redemption deducts DooCoins from balance

### Goals Management

- [ ] View current goal for a child
- [ ] Set a reward as the current goal
- [ ] Current goal displays prominently on dashboard
- [ ] Progress toward goal shows correctly
- [ ] Can change/update current goal
- [ ] Clear/remove current goal
- [ ] Setting goal from card updates rewards list
- [ ] Setting goal from rewards list updates card display
- [ ] Goal changes sync correctly between card and list views

### Transactions/Wallet

- [ ] View transaction history for each child
- [ ] Transactions show correct type (task, reward, manual adjustment)
- [ ] Amounts and dates display correctly
- [ ] Can filter/sort transactions
- [ ] Transaction details expand/show more info

---

## 3. Kids App - Core Features

### Dashboard/Home Screen

- [ ] Child's name and balance display correctly
- [ ] Current goal shows prominently (if set)
- [ ] Available tasks display
- [ ] Available rewards display
- [ ] Navigation works smoothly

### Task Management

- [ ] View all available tasks
- [ ] Can see task name and DooCoin value
- [ ] Can request task completion
- [ ] Request sends to parent app
- [ ] Visual feedback when request sent

### Rewards/Goals

- [ ] View all available rewards
- [ ] Current goal highlighted
- [ ] Progress bar shows correctly
- [ ] Can request reward redemption
- [ ] Request sends to parent app

### Balance & History

- [ ] DooCoin balance displays correctly
- [ ] Transaction history shows
- [ ] Recent activities appear

---

## 4. Cross-App Sync & Requests

### Parent Creates Task → Kids App

- [ ] Create task in parent app
- [ ] Task appears in kids app
- [ ] Task details (name, value) match
- [ ] Updates in real-time or after refresh

### Parent Creates Reward → Kids App

- [ ] Create reward in parent app
- [ ] Reward appears in kids app
- [ ] Reward details match

### Parent Sets Goal → Kids App

- [ ] Set goal in parent app
- [ ] Goal appears on kids dashboard
- [ ] Progress bar shows correctly in both apps

### Kids Requests Task → Parent Approves

- [ ] Child requests task completion in kids app
- [ ] Request appears in parent app
- [ ] Parent approves request
- [ ] DooCoins added to child balance
- [ ] Balance updates in both apps
- [ ] Transaction recorded in both apps

### Kids Requests Reward → Parent Approves

- [ ] Child requests reward in kids app
- [ ] Request appears in parent app
- [ ] Parent approves redemption
- [ ] DooCoins deducted from balance
- [ ] Balance updates in both apps
- [ ] Transaction recorded in both apps

### Data Consistency

- [ ] Balances match between parent and kids apps
- [ ] Task lists are identical
- [ ] Reward lists are identical
- [ ] Transaction histories match
- [ ] No duplicate entries
- [ ] No missing data

---

## 5. Mobile-Specific Features

### Parent App UI/UX

- [ ] App layout adapts to device screen size
- [ ] Portrait orientation works correctly
- [ ] Landscape orientation works (if supported)
- [ ] All buttons are tappable with proper touch targets
- [ ] Scrolling is smooth throughout app
- [ ] No UI elements cut off or overlapping

### Kids App UI/UX

- [ ] App layout adapts to device screen size
- [ ] Portrait orientation works correctly
- [ ] Landscape orientation works (if supported)
- [ ] All buttons are tappable with proper touch targets
- [ ] Scrolling is smooth throughout app
- [ ] No UI elements cut off or overlapping

### Navigation

- [ ] Bottom navigation bar works (if present)
- [ ] Back button/gestures work correctly
- [ ] Modal dialogs open and close properly
- [ ] Deep linking works (if implemented)
- [ ] Tab switching maintains state

### Performance

- [ ] App launches in reasonable time
- [ ] Page transitions are smooth
- [ ] No lag when scrolling lists
- [ ] Images load efficiently
- [ ] No memory warnings or crashes

### Offline Behavior

- [ ] Parent app shows appropriate message when offline
- [ ] Kids app shows appropriate message when offline
- [ ] Graceful degradation when connection drops
- [ ] Data syncs when connection restored
- [ ] No app crashes due to network issues

---

## 6. Data Persistence & Sync

### Parent App - Local State

- [ ] Created tasks persist after app restart
- [ ] Child profiles remain after closing app
- [ ] In-progress changes don't get lost on background

### Kids App - Local State

- [ ] Login state persists
- [ ] Balance cached for offline viewing
- [ ] Task/reward lists cached

### Backend Sync

- [ ] Changes in parent app sync to backend
- [ ] Changes in kids app sync to backend
- [ ] Both apps fetch latest data from backend
- [ ] Multiple devices stay in sync
- [ ] No duplicate entries from sync conflicts
- [ ] ICP backend calls succeed consistently

---

## 7. Edge Cases & Error Handling

### Input Validation

- [ ] Empty fields show validation errors
- [ ] Invalid DooCoin amounts rejected (negative/non-numeric)
- [ ] Long text inputs handled gracefully
- [ ] Special characters don't break forms

### Error States

- [ ] Network errors show helpful messages
- [ ] Failed API calls don't crash app
- [ ] Retry mechanisms work for failed operations
- [ ] Backend errors display user-friendly messages

### Boundary Conditions

- [ ] Zero balance handled correctly
- [ ] Large DooCoin amounts (1000+) display properly
- [ ] Empty states (no tasks/rewards) show helpful prompts
- [ ] Maximum limits enforced (if any)

---

## 8. Security & Privacy

### Authentication Security

- [ ] Cannot access app features without login
- [ ] Session token not exposed in logs
- [ ] Logout completely clears session
- [ ] No auth bypass vulnerabilities

### Data Security

- [ ] Parent: Child data only visible to authenticated parent
- [ ] Parent: Cannot access other users' data
- [ ] Kids: Can only see own child's data
- [ ] PINs are secure

---

## 9. iOS-Specific Checks

### Parent App - System Integration

- [ ] App icon displays correctly on home screen
- [ ] Launch screen shows properly
- [ ] Status bar styled appropriately
- [ ] Keyboard appears/dismisses correctly
- [ ] Keyboard doesn't cover input fields
- [ ] Copy/paste works in text fields

### Kids App - System Integration

- [ ] App icon displays correctly on home screen
- [ ] Launch screen shows properly
- [ ] Keyboard works for PIN entry

### Permissions

- [ ] Push notifications (if implemented)

### iOS Features

- [ ] Dark mode support (if implemented)

---
