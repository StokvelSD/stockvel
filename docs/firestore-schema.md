# Firestore Database Schema – Stokvel App

This document describes the Firestore database structure used in the Stokvel project.

---

## Collections Overview

### users (collection)
Stores registered user profiles.

**Document ID:** userId (Firebase Auth UID)

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "createdAt": "timestamp"
}
```

### groups (collection)
Stores stokvel groups.

**Document ID:** auto-generated

```json
{
  "groupName": "Monthly Savers",
  "contributionAmount": 500,
  "description": "Group description",
  "maxMembers": 10,
  "meetingFrequency": "monthly",
  "duration": 12,
  "payoutOrder": "random",
  "members": ["userId1", "userId2"],
  "createdAt": "timestamp"
}
```

**Note:** Users join groups directly without needing admin approval. The `members` array stores the Firebase Auth UIDs of all group members.