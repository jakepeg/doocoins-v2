# 🚀 DooCoins – Sharing a Child

## 1. Overview

Parents can share a child with another adult (e.g., co-parent, grandparent, teacher) using a unified sharing mechanism.

When sharing, the app generates:

- **Deep link** (e.g., `https://doo.co/share/{uniqueShareId}`)
- **QR code**
- **Magic code**

This creates a simple, consistent, cross-platform flow across iOS, Android, and web.

**Note:** The Invite Child flow for the kids app remains unchanged using the original magic code method. Deep links and QR codes will be added to Invite Child in a future update.

---

## 2. User Roles & Permissions

### Creator (Original Parent)

The adult who created the child record. They can:

- Share child
- Invite child (kids app login)
- Rename child
- Delete child
- Revoke sharing (removes all shared adults)
- Perform all parent actions (tasks, approvals, goals, rewards)

Identified via `isCreator = true`.

### Shared Adult

Added a child via deep link, QR, or magic code. They can:

- View/manage tasks, approvals, rewards/goals

They **cannot**:

- Share
- Invite
- Rename
- Delete
- Revoke sharing

**UX Behavior:** Restricted actions are hidden from shared adults (Option B: cleanest UX).  
Actions menu shows only **View [child name]**, but tasks, rewards, goals, and approvals are accessible inside the child.

---

## 3. Shared Child Indicator

In the child list, children who have been shared with multiple adults display a **share icon (👥)** next to their name.

---

## 4. Unified Sharing Flow

_(Replaces the old magic-code-only flow)_

### 4.1 When Creator Selects "Share Child"

The app generates all three:

#### 1. Deep Link

- Example: `https://doo.co/share/{uniqueShareId}`
- **Behavior:**
  - If app installed → opens and adds child
  - If not installed → opens App Store/Play Store
  - After installation → first launch auto-claims the child

#### 2. QR Code

- Encodes the deep link URL
- **Scanning:**
  - Opens DooCoins via universal link
  - If app not installed → Store → auto-claim on first launch

#### 3. Magic Code

- Short alphanumeric or 4-digit code (e.g., `1234`)
- Displayed with large code boxes and copy icon
- Label: "Or enter this code manually"
- **Expiry countdown:** always 60 minutes

---

### 4.2 Share Child Screen

When the creator selects **Share [Child Name]**, they see the Share Child screen.

#### Screen Layout:

- **Title:** "Share [Child Name] with another adult (family member, teacher, etc.)"
- **QR code**
- **Deep link** text field with copy icon
- **Magic code** in large digits with copy icon
- **60-minute expiration countdown**

#### Instructions:

- "Another adult can scan the QR code, tap the link, or enter the magic code to add this child."
- "If they don't have the app installed, they'll be taken to the app store and the child will be added automatically after installation."

#### Actions:

- **Done** — returns to previous screen
- Sharing is automatic; no additional settings required

---

### 4.3 Add Child Flow (Other Adult)

When the user taps **+ Add Child**, they see an **Add a Child popup** with a toggle:

#### Option 1 — Create New Child (default)

- Toggle unchecked
- Text field placeholder: "Child name"
- User enters a name → **Add Child**

#### Option 2 — Add Using a Magic Code

- Toggle checked
- Field placeholder: "Enter 4-digit magic code"
- User enters code → **Add Child**

#### Automatic Versions of This Flow

- **Tapping a deep link** → child added automatically
- **Scanning a QR code** → child added automatically

#### Success State

- Child is added to the user's list
- **👥 share icon** appears

#### Error States

- **Invalid code:** "Invalid magic code."
- **Expired code:** "This code has expired. Please ask for a new one."
- **Already shared:** "You already have access to this child."

---

### 4.4 Revoke Sharing

Creators can revoke sharing for a child at any time.

#### Location:

- Child actions menu (child list + balance card)

#### Action: Revoke All Sharing

Triggers confirmation dialog:

- **Title:** "Revoke all sharing?"
- **Message:** "This will remove access to [Child Name] for all other adults. Only you will be able to see and manage this child."
- **Buttons:** Cancel / Revoke (destructive)

#### Outcome:

- All shared adults removed
- Creator retains sole access
- Other adults silently lose access (child disappears from list)
- No notifications sent

---

## 5. Child Actions Menu

### Creator Sees

- View [child name]
- Share [child name]
- Rename [child name]
- Revoke all shares (if shared)
- Delete [child name]

### Shared Adult Sees

- Only **View [child name]**
- All other actions are hidden

---

## 6. Sorting & Child List Behavior

- No visual distinction between creator vs shared children except the **👥 icon**
- List shows all accessible children
- Order follows backend's return order
- Newly added children appear at top or in natural order (product decision)

---

## 7. Technical Implementation Notes

### Deep Links & Universal Links

- **iOS:** Requires Associated Domains entitlement + `apple-app-site-association` file
- **Android:** Requires App Links setup with `assetlinks.json`
- **Testing:** Deep links and QR codes won't work until app is published to app stores
- **MVP Focus:** Magic code method will be fully functional for testing

### Backend Data Model

- Add `parentIds: [Principal]` to `Child` type
- Add `creatorId: Principal` to `Child` type (or derive from child ID)
- `ShareInvite` type: `{ code: Nat, childId: Text, expiresAt: Int }`
- Magic code: 4-digit, 60-minute expiry, reusable (like current invite flow)

### Migration

- One-time migration function to add `creatorId` and `parentIds` to existing children
- Existing children: `creatorId` = profile owner, `parentIds = [creatorId]`

---

## 8. Future Enhancements

- Add deep links + QR codes to Invite Child flow (kids app)
- Push notifications when child is shared with adult
- Analytics tracking for share method usage (link vs QR vs code)
- Ability to set custom permissions per shared adult
- League table sorting by points (mentioned in planning)
