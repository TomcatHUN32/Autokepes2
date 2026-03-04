# TuningTalálkozó App - PRD

## Original Problem Statement
GitHub repo: autotalalka2 - Add image upload functionality when creating events

## User Requirements
1. Store images on the web server (locally) with delete capability
2. Only 1 image per event
3. Max 5MB file size

## Core Features Implemented

### Image Upload Feature (2026-03-04)
- **Backend:**
  - POST `/api/upload/event-image` - Upload image for event
  - DELETE `/api/upload/event-image/{filename}` - Delete uploaded image
  - Images stored in `/app/backend/uploads/events/`
  - Static file serving at `/api/uploads/`
  - File validation: max 5MB, jpg/jpeg/png/gif/webp only

- **Frontend (Events.js):**
  - Image upload UI in event creation dialog
  - Drag-and-drop upload area
  - Image preview after upload
  - Delete button to remove uploaded image
  - File type and size validation on client side
  - Images displayed on event cards

## Tech Stack
- Backend: FastAPI, MongoDB, Socket.IO
- Frontend: React, TailwindCSS
- Image storage: Local filesystem

## What's Been Implemented
- [x] Image upload endpoint
- [x] Image delete endpoint
- [x] Frontend upload UI with preview
- [x] File validation (size & type)
- [x] Image display on event cards
- [x] Automatic image cleanup when event deleted

## Next Action Items
- Test full flow with real user registration and event creation
- Add image compression for large images
- Consider CDN for production deployment
