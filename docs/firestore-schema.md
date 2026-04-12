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
  "createdAt": "timestamp"
}
```

### joinRequests (collection)
Stores join requests from users to groups.

**Document ID:** auto-generated

```json
{
  "groupId": "groupDocId",
  "userId": "userDocId",
  "status": "pending|approved|rejected",
  "createdAt": "timestamp"
}
```