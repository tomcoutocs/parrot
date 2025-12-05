# Parrot Client Portal

A comprehensive client portal web application with role-based access control, built with modern web technologies for optimal performance and user experience.

## 🚀 Features

### ✅ Completed Features

#### Authentication & Security
- **Role-based access control** (Admin, Manager, User)
- **Secure authentication** with NextAuth.js
- **Row-level security** with Supabase
- **JWT session management**
- **User management system** with admin controls

#### Dashboard & Analytics
- **Interactive analytics dashboard** with Recharts
- **KPI tracking** (Revenue, Clients, Appointments, Documents)
- **Professional UI** with Tailwind CSS + shadcn/ui
- **Responsive design** for all devices
- **Role-based navigation** and permissions

#### Project Management
- **Kanban board** for task management
- **Project organization** and tracking
- **Task assignment** and collaboration
- **Activity logging** and audit trails

#### Forms System
- **Dynamic form builder** for admins
- **Multiple field types** (text, email, number, select, etc.)
- **Form submission tracking**
- **Role-based form access**

#### Database Architecture
- **12 core tables** supporting all features
- **Optimized indexes** for performance
- **Security policies** implemented
- **Demo data** for testing
- **Audit logging** infrastructure

### 🚧 Planned Features

#### High Priority
- **Real-time Chat System** - Manager-client communication
- **Document Management** - Secure file sharing and organization
- **Appointment Booking** - Calendar integration and scheduling
- **Calendar Integration** - Advanced scheduling features

#### Medium Priority
- **Mobile Application** - Native iOS/Android apps
- **Advanced Analytics** - Predictive insights and custom reports
- **Third-party Integrations** - CRM, calendar, accounting systems

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js with custom credentials provider
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Form Handling**: React Hook Form with Zod validation

## 📋 Prerequisites

- Node.js 18+
- npm or yarn package manager
- Supabase account and project

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd client-portal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Email Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com  # Must be from a verified domain in Resend
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your production URL for email links
```

### 4. Database Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
3. This will create all necessary tables and demo data

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 👥 User Roles & Permissions

### 🔴 Admin Users
**Full system access and management capabilities**

**Can Access:**
- All dashboard tabs (Analytics, Projects, Forms, Services, Calendar, Documents, Chat, Admin Panel)
- System-wide analytics and reporting
- User management and role assignment
- Global settings and configuration
- All client data across the platform

### 🔵 Manager Users
**Client management and assigned account oversight**

**Can Access:**
- Manager dashboard (Analytics, Projects, Forms, Services, Calendar, Documents, Chat)
- Analytics for assigned clients only
- Document management for their clients
- Direct communication with assigned users
- Appointment scheduling and management

### 🟢 User (Client) Accounts
**Personal dashboard and service access**

**Can Access:**
- Client dashboard (Analytics, Projects, Forms, Services, Book Call, Calendar, Documents, Chat)
- Personal analytics and progress tracking
- Service booking with assigned manager
- Document access and sharing
- Direct manager communication

## 🏗️ Architecture Overview

### Database Schema
The application uses a normalized PostgreSQL database with the following key tables:

- **users**: User profiles with role-based permissions
- **messages**: Real-time chat functionality
- **documents**: File management with access controls
- **appointments**: Booking and scheduling system
- **services**: Business service catalog
- **forms**: Dynamic form builder
- **form_submissions**: Form response storage
- **projects**: Project management and organization
- **tasks**: Kanban board task management
- **task_comments**: Task-specific discussions
- **task_activities**: Task audit trail and history
- **activity_logs**: Comprehensive audit trail

### Security Features
- **Row Level Security (RLS)**: Database-level access control
- **JWT Authentication**: Secure session management
- **Role-based UI**: Dynamic interface based on user permissions
- **Data Isolation**: Each role sees only relevant data
- **Audit Logging**: Track all user activities

## 📁 Project Structure

```
client-portal/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Main dashboard
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── tabs/             # Dashboard tab components
│   │   ├── modals/           # Modal components
│   │   └── providers/        # Context providers
│   ├── lib/                  # Utility functions
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── supabase.ts       # Database client
│   │   └── utils.ts          # General utilities
│   └── types/                # TypeScript type definitions
├── database/
│   └── schema.sql            # Database schema and seed data
├── docs/                     # Documentation files
├── public/                   # Static assets
└── README.md
```

## 🎨 UI/UX Design Principles

- **Clean & Professional**: Business-focused design language
- **Responsive First**: Mobile-optimized layouts
- **Accessible**: WCAG compliance with semantic HTML
- **Consistent**: Design system with reusable components
- **Performance**: Optimized for fast loading and smooth interactions

## 🔧 Development

### Adding New Components
```bash
npx shadcn@latest add [component-name]
```

### Database Migrations
Execute SQL scripts in your Supabase dashboard SQL editor.

### Environment Variables
All environment variables should be prefixed with `NEXT_PUBLIC_` for client-side access or kept private for server-side operations.

## 📊 Analytics & Monitoring

The analytics dashboard provides insights into:

- **Revenue Metrics**: Monthly performance tracking
- **User Activity**: Engagement and usage patterns
- **Service Utilization**: Popular services and booking trends
- **System Health**: Performance and error monitoring

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on every push

### Manual Deployment
```bash
npm run build
npm start
```

## 🔒 Security Considerations

- Use strong passwords for NEXTAUTH_SECRET
- Configure Supabase RLS policies properly
- Regularly update dependencies
- Implement HTTPS in production
- Monitor for suspicious activities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for common solutions
- Review the setup instructions

## 🎯 Roadmap

### High Priority Features

#### 1. Real-time Chat System
- **Priority**: High
- **Effort**: High
- **User Stories**:
  - As a user, I want to chat with my assigned manager so that I can get quick support
  - As a manager, I want to see all my client conversations so that I can provide effective support

#### 2. Document Management System
- **Priority**: High
- **Effort**: Medium
- **User Stories**:
  - As a user, I want to upload documents so that I can share files with my manager
  - As a manager, I want to organize client documents so that I can find them easily
  - As an admin, I want to control document permissions so that sensitive data is protected

#### 3. Appointment Booking System
- **Priority**: Medium
- **Effort**: High
- **User Stories**:
  - As a user, I want to book appointments with my manager so that I can schedule consultations
  - As a manager, I want to manage my availability so that users can book appropriate times
  - As a user, I want to receive appointment reminders so that I don't miss meetings

### Medium Priority Features

#### 4. Calendar Integration
- **Priority**: Medium
- **Effort**: Medium
- **User Stories**:
  - As a user, I want to view my appointments in a calendar so that I can manage my schedule
  - As a manager, I want to see all client appointments so that I can plan my day
  - As an admin, I want to view system-wide calendar usage so that I can optimize resources

#### 5. Advanced Analytics
- **Priority**: Low
- **Effort**: Medium
- **User Stories**:
  - As an admin, I want detailed analytics so that I can make data-driven decisions
  - As a manager, I want client performance metrics so that I can provide better service
  - As a user, I want personal analytics so that I can track my progress

### Technical Debt & Infrastructure

#### 6. Performance Optimization
- **Priority**: Medium
- **Effort**: Medium
- **Tasks**:
  - Implement lazy loading for dashboard components
  - Optimize database queries and add caching
  - Add image optimization and CDN integration
  - Implement service worker for offline capability

#### 7. Testing & Quality Assurance
- **Priority**: Medium
- **Effort**: Medium
- **Tasks**:
  - Add unit tests with Jest and React Testing Library
  - Implement E2E testing with Playwright
  - Add performance monitoring with Web Vitals
  - Set up automated accessibility testing

## 🎉 Project Success

This client portal project delivers a **production-ready MVP** that provides immediate business value while establishing a solid foundation for future growth. The combination of modern technology, professional design, and comprehensive planning ensures both short-term success and long-term scalability.

**Key Achievements:**
✅ Professional client portal ready for immediate use  
✅ Role-based security protecting sensitive business data  
✅ Modern, responsive design improving user experience  
✅ Scalable architecture supporting business growth  
✅ Comprehensive documentation enabling team success  

**Ready for:** Production deployment, client demos, feature development, and business growth.