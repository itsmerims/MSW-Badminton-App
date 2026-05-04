# Supabase Migration Guide

This guide walks you through migrating your Badminton Queuing Management app from localStorage to Supabase.

## Overview

The migration includes:
- Supabase client utilities for both client and server components
- Database schema with players, queue, courts, matches, fees, and settings tables
- Supabase Auth for admin dashboard
- Real-time updates on the queue table
- Server Actions for Manual Match and Quick Match operations

## Folder Structure

```
src/
├── lib/
│   └── supabase/
│       ├── client.ts       # Browser client for client components
│       ├── server.ts       # Server client for server components
│       ├── middleware.ts    # Middleware for session management
│       └── auth.ts         # Auth utilities (signIn, signOut, getCurrentUser)
├── context/
│   └── SupabaseClubContext.tsx  # Replaces ClubContext with Supabase operations
├── app/
│   ├── actions/
│   │   └── match-actions.ts     # Server Actions for match operations
│   ├── login/
│   │   └── page.tsx            # Login page for admin dashboard
│   └── middleware.ts           # Next.js middleware for auth
└── components/
    └── auth/
        ├── LoginForm.tsx       # Login form component
        └── LogoutButton.tsx    # Logout button component
```

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be provisioned (2-3 minutes)

### 2. Run the SQL Migration

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `docs/supabase-migration.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration

This will create:
- `players` table
- `courts` table
- `queue` table (with Realtime enabled)
- `matches` table
- `fees` table
- `settings` table
- `payment_methods` table
- Row Level Security (RLS) policies
- Indexes for performance

### 3. Configure Environment Variables

Your `.env.local` file should contain:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Get these values from:
- Supabase Dashboard → Settings → API
- Copy the Project URL and anon/public key

**Important**: After adding these variables, you MUST restart your development server:
```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

If you see an error about missing environment variables:
1. Verify the .env.local file exists in your project root (same level as package.json)
2. Ensure the variable names are exactly: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Make sure there are no extra spaces or quotes around the values
4. Restart the dev server after making changes

### 4. Set Up Authentication

1. In Supabase Dashboard, go to Authentication → Providers
2. Enable Email/Password provider
3. Create an admin user:
   - Go to Authentication → Users
   - Click "Add User"
   - Enter email and password
   - Set user as confirmed

### 5. Test the Migration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:9002/login`
3. Sign in with your admin credentials
4. Test the dashboard to ensure all features work

## Key Changes

### Replaced Components

- `ClubContext` → `SupabaseClubContext` (now uses Supabase instead of localStorage)
- `useClub()` → `useSupabaseClub()` hook
- All context methods are now async (return Promises)

### New Features

- **Real-time Updates**: Queue table updates are pushed to all connected clients automatically
- **Server Actions**: Manual Match and Quick Match now use Server Actions for better performance
- **Authentication**: Admin dashboard is now protected with Supabase Auth
- **Persistent Data**: All data is stored in Supabase instead of localStorage

### Database Schema

#### Players
```sql
- id (UUID, primary key)
- name (text)
- skill_level (integer)
- wins (integer)
- games_played (integer)
- partner_history (text array)
- status (text: 'available' | 'playing' | 'resting')
- improvement_score (integer)
- total_play_time_minutes (integer)
- last_available_at (timestamp)
- created_at (timestamp)
```

#### Queue
```sql
- id (UUID, primary key)
- player_id (UUID, foreign key to players)
- status (text: 'bench' | 'queue' | 'court')
- court_id (UUID, foreign key to courts, nullable)
- entry_time (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Matches
```sql
- id (UUID, primary key)
- team_a (UUID array)
- team_b (UUID array)
- team_a_snapshots (JSONB)
- team_b_snapshots (JSONB)
- team_a_score (integer)
- team_b_score (integer)
- court_id (UUID, foreign key to courts, nullable)
- timestamp (timestamp)
- start_time (timestamp)
- end_time (timestamp)
- is_completed (boolean)
- status (text: 'ongoing' | 'completed' | 'cancelled')
- winner (text: 'teamA' | 'teamB', nullable)
```

#### Fees
```sql
- id (UUID, primary key)
- player_id (UUID, foreign key to players)
- amount (decimal)
- is_paid (boolean)
- status (text: 'pending' | 'completed')
- fee_type (text: 'shuttle' | 'court' | 'entrance')
- date (date)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Settings
```sql
- id (UUID, primary key)
- key (text, unique)
- value (text)
- description (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

## Troubleshooting

### Connection Issues

If you see connection errors:
1. Verify your `.env.local` has the correct values
2. Check that your Supabase project is active
3. Ensure RLS policies allow your operations

### Real-time Not Working

If real-time updates aren't working:
1. Check that Realtime is enabled for the `queue` table in Supabase Dashboard
2. Verify the publication includes the queue table
3. Check browser console for subscription errors

### Authentication Issues

If login fails:
1. Verify Email/Password provider is enabled
2. Check that the user is confirmed in Supabase Dashboard
3. Ensure your anon key has the correct permissions

### TypeScript Errors

If you see TypeScript errors:
1. Run `npm run typecheck` to see all errors
2. Ensure all imports are using `useSupabaseClub` instead of `useClub`
3. Check that async functions are properly awaited

## Next Steps

1. **Deploy to Vercel**: 
   - Add your environment variables to Vercel project settings
   - Deploy your Next.js app

2. **Monitor Performance**:
   - Use Supabase Dashboard to monitor database performance
   - Check Realtime subscription counts

3. **Backup Strategy**:
   - Enable daily backups in Supabase Dashboard
   - Consider setting up point-in-time recovery

4. **Security**:
   - Review RLS policies in production
   - Consider adding additional authentication providers (Google, GitHub)

## Migration Checklist

- [x] Install @supabase/supabase-js and @supabase/ssr
- [x] Create Supabase client utilities
- [x] Create SQL migration
- [x] Create SupabaseClubContext
- [x] Update layout.tsx to use SupabaseClubProvider
- [x] Update all pages to use useSupabaseClub
- [x] Implement authentication
- [x] Enable Realtime on queue table
- [x] Create Server Actions for match operations
- [x] Fix TypeScript errors
- [ ] Run SQL migration in Supabase Dashboard
- [ ] Configure environment variables
- [ ] Test authentication flow
- [ ] Test all CRUD operations
- [ ] Deploy to production

## Support

For issues related to:
- **Supabase**: https://supabase.com/docs
- **Next.js**: https://nextjs.org/docs
- **This migration**: Check the code comments in each file
