# Ready TMS - Enterprise Transportation Management System

## Overview
Ready TMS is an enterprise-level Transportation Management System for readytms.com, managing all aspects of a trucking business. It covers load dispatch, fleet and driver management, DOT compliance, full accounting (AR/AP), CRM, driver settlements, maintenance, and financial analytics, aiming to be a comprehensive solution for trucking operations.

## User Preferences
- I prefer simple language.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to folder Z.
- Do not make changes to file Y.

## System Architecture

### UI/UX Decisions
The system features a professional UI built with Shadcn UI and Radix primitives, styled with Tailwind CSS. It uses a consistent design system with a primary blue color scheme, specific colors for success, warning, and danger states, and the Inter font family. It supports both light and dark modes, detecting system preferences. Common UI patterns include searchable tables with status badges and action buttons, form-based dialogs with validation, helpful empty states, skeleton loaders for loading states, and toast notifications for user feedback.

### Technical Implementations
The application is a full-stack web application. The frontend is built with React 18 and TypeScript, using Wouter for routing, TanStack Query v5 for state management, React Hook Form with Zod for form validation, and date-fns for date handling. The backend uses Express.js with a PostgreSQL database (Neon-backed on Replit) and Drizzle ORM for type-safe queries. Authentication uses traditional email/password authentication with Passport Local Strategy and bcrypt password hashing, Express sessions backed by a PostgreSQL store (connect-pg-simple), and protected routes with auth guards. End-to-end type safety is maintained using shared schemas.

### Feature Specifications
The system provides a comprehensive set of modules:
- **Dashboard**: Real-time operational metrics, recent activity, fleet status, and quick navigation.
- **Load Management**: Full load lifecycle, driver/truck assignment, status workflow, expense/profit tracking, file attachments (PDFs/images for invoices and PODs), and prominent POD Gallery with thumbnail previews, full-screen viewer, and download functionality for driver-uploaded PODs.
- **Fleet Management**: Truck inventory, status tracking, and maintenance records.
- **Driver Management**: Comprehensive driver roster with full DOT compliance tracking, including CDL, medical card, SSN, employment, and contact information.
- **GPS Driver Tracking**: Real-time location tracking with API endpoints for mobile apps, live location display with coordinates and Google Maps links.
- **Driver Self-Registration**: Public-facing driver signup at `/driver-signup` for self-onboarding.
- **Driver Portal**: Mobile-friendly web portal for drivers to share GPS location, toggle duty status, view assignments, and upload PODs.
- **Driver POD Upload Portal**: Secure, mobile-optimized web app at `/driver-pod` for drivers to upload Proof of Delivery documents with camera integration and multi-file support.
- **GPS Notification System**: Multi-channel notification system for GPS tracking reminders:
  - Email notifications when admin enables GPS tracking for a driver
  - Daily reminder emails for drivers who haven't shared location in 24 hours
  - Browser push notifications in driver portal for real-time alerts
  - SMS notifications via RingCentral (pending credentials setup)
- **Safety & Compliance**: Includes Inspections, Accidents & Incidents reporting, and Violations & Citations tracking.
- **Accounting & Financial Management**: Financial Overview, Invoices (AR) with multi-file attachment support (rate confirmations, BOLs, etc.), Expense Management, and Payments & Cash Management. Invoices feature professional PDF generation with clean, simple layout and email-to-factoring functionality with automatic attachment inclusion.
- **Customer Management**: Full CRM for shippers and receivers, contact information, and load history.
- **Driver Settlements**: Automated payroll calculations with percentage-based pay, comprehensive deduction tracking, net pay calculation, and settlement history with PDF export. Settlements include dispatch percentage, advance management, and fuel tracking (Flying J, Fleet One).
- **Task Manager**: Daily task and reminder system with recurring task support.
- **Maintenance Management**: Service record system with next service date tracking, preventive maintenance scheduling, and PDF attachment support.
- **Fuel Tracking & Management**: Fuel card account management with FleetOne (WEX) and Pilot Flying J integration, manual transaction entry, and expense tracking.
- **Automation & Workflows**: Enterprise-grade automation engine for tasks like auto-invoice generation, expiring document alerts, and load status notifications.
- **Company Settings**: Editable company branding system for professional document generation, including company name, address, contact, and logo.

### System Design Choices
- **Development Approach**: Schema-first design with data models defined for type consistency, followed by horizontal layer implementation.
- **Authentication & Security**: Traditional Email/Password Authentication using Passport Local Strategy with separate strategies for admin and driver login. Passwords hashed using bcrypt with SHA-256 hashed password reset tokens. Session-based authentication with secure HTTP-only cookies and PostgreSQL-backed session persistence. Admin approval system for new admin registrations with email notifications via Resend integration. Email-based password reset with one-hour token expiration and one-time use tokens.
- **Notification System**: Multi-channel notification infrastructure using Resend for email notifications (uses onboarding@resend.dev as default sender) and RingCentral SDK for SMS (when credentials are provided). Supports automated GPS tracking reminders, document expiration alerts, and system notifications.
- **Invoice PDF Generation**: Client-side PDF generation using jsPDF with clean, professional layout matching industry standards. Format includes: invoice title, company information, bill-to section, invoice number and date (right-aligned), simple description/amount table showing load number, total amount, and terms & conditions footer ("Thank you. Payment is due within 15 days").
- **Data Layer**: PostgreSQL with Drizzle ORM, proper foreign key relationships, data normalization, and Drizzle Kit for migrations.
- **API Design**: RESTful endpoint structure with Zod validation, consistent response formats, and proper HTTP status codes.
- **Performance**: Utilizes TanStack Query for caching, database indexing, and optimized SQL queries.
- **Compliance Monitoring**: Automated expiration tracking for CDL licenses and medical cards.

## External Dependencies
- **Database**: PostgreSQL (Neon-backed on Replit)
- **Authentication**: Passport.js with passport-local strategy
- **Password Hashing**: bcrypt
- **Session Management**: Express-session with connect-pg-simple
- **Email Service**: Resend API for transactional emails (password reset, GPS notifications)
- **SMS Service**: RingCentral SDK (pending credential setup - requires RC_SERVER_URL, RC_APP_CLIENT_ID, RC_APP_CLIENT_SECRET, RC_USER_JWT, RC_PHONE_NUMBER)
- **UI Components**: Shadcn UI, Radix primitives
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Pending Integrations
- **RingCentral SMS**: User will provide credentials at a later time. System is designed to gracefully handle SMS when credentials become available. Required secrets: RC_SERVER_URL, RC_APP_CLIENT_ID, RC_APP_CLIENT_SECRET, RC_USER_JWT, RC_PHONE_NUMBER