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
  - Images displayed on event cards

### Messaging System Update (2026-03-05)
- **Changed from Socket.IO to Polling-based messaging**
  - Simpler, more reliable for production deployments
  - Messages polled every 3 seconds
  - POST `/api/messages/send` endpoint for sending messages
  - No WebSocket required

## Tech Stack
- Backend: FastAPI, MongoDB
- Frontend: React, TailwindCSS
- Image storage: Local filesystem
- Messaging: HTTP polling (no WebSocket)

## Deployment Notes for ArubaCloud
- Backend service: systemd unit at `/etc/systemd/system/backend.service`
- Nginx config: `/etc/nginx/sites-enabled/default`
- No Socket.IO proxy needed anymore

## What's Been Implemented
- [x] Image upload endpoint
- [x] Image delete endpoint
- [x] Frontend upload UI with preview
- [x] File validation (size & type)
- [x] Image display on event cards
- [x] Polling-based messaging system
- [x] Array.isArray fixes for API responses

## Next Action Items
- Deploy updated code to questgearhub.com
- Test messaging functionality
