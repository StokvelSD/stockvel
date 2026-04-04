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