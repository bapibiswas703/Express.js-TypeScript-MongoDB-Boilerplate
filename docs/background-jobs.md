# Background Jobs & External Services

The project uses **Agenda** for background job processing and includes service integrations for email (SMTP), push notifications (Firebase FCM), and file storage (AWS S3).

## Agenda (Job Queue)

Agenda is a job scheduling library that uses MongoDB for storage — no Redis required. Jobs are stored in the `jobs` collection.

### Configuration

```
Source: src/common/queues/queue.service.ts

- Backend: MongoDB (same database as the app)
- Collection: jobs
- Poll interval: 10 seconds
- Max concurrency: 10 jobs
```

### Lifecycle

Agenda starts during the boot sequence (`src/app.ts`):

```
1. MongoDB connects
2. Roles are seeded
3. Agenda starts (connects to MongoDB 'jobs' collection)
4. Express app is set up
5. Server listens
```

On shutdown (SIGTERM/SIGINT), Agenda stops gracefully before the server closes.

### Email Queue

```typescript
import { queueEmail, queueBulkEmail } from '../common/queues';

// Send a single email (processed in background)
await queueEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',
  data: { name: 'John', loginUrl: 'https://app.com/login' },
});

// Send with a delay (e.g., 5 minutes)
await queueEmail(payload, 5 * 60 * 1000);

// Send multiple emails
await queueBulkEmail([payload1, payload2, payload3]);
```

The email worker (`src/common/queues/email.queue.ts`) processes each job by calling `sendEmail()` from the email service.

### Push Notification Queue

```typescript
import { queuePushNotification, queueMulticastNotification } from '../common/queues';

// Send to a single device
await queuePushNotification({
  token: 'fcm-device-token',
  title: 'New Order',
  body: 'Your order has been confirmed',
  data: { orderId: '123' },
});

// Send to multiple devices
await queueMulticastNotification({
  tokens: ['token1', 'token2'],
  title: 'Announcement',
  body: 'Check out our new feature',
});
```

### Adding a New Job Type

1. Create a new queue file in `src/common/queues/`:

```typescript
// src/common/queues/report.queue.ts
import type { Job } from 'agenda';
import { agenda } from './queue.service';

interface ReportPayload {
  userId: string;
  reportType: string;
}

const JOB_NAME = 'generate-report';

agenda.define(JOB_NAME, async (job: Job) => {
  const payload = job.attrs.data as ReportPayload;
  // Generate report logic here
});

export const queueReport = async (payload: ReportPayload): Promise<void> => {
  await agenda.now(JOB_NAME, payload);
};
```

2. Export from `src/common/queues/index.ts`:

```typescript
export { queueReport } from './report.queue';
```

3. Use it in your service:

```typescript
import { queueReport } from '../../common/queues';
await queueReport({ userId: 'abc', reportType: 'monthly' });
```

## Email Service

```
Source: src/common/services/email.service.ts
Transport: Nodemailer (SMTP)
```

### Configuration

Set these environment variables:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@example.com
```

### Email Payload

```typescript
interface EmailPayload {
  to: string;
  subject: string;
  template?: string;    // Template name (uses EJS views)
  data?: Record<string, any>;  // Template variables
  html?: string;        // Raw HTML (alternative to template)
}
```

### Usage

Always queue emails rather than sending synchronously to avoid blocking the request:

```typescript
// In a service
import { queueEmail } from '../../common/queues';

await queueEmail({
  to: user.email,
  subject: 'Password Reset',
  template: 'password-reset',
  data: { name: user.name, resetUrl: 'https://...' },
});
```

## Push Notifications (Firebase FCM)

```
Source: src/common/services/notification.service.ts
Transport: Firebase Admin SDK
```

### Configuration

```
FCM_PROJECT_ID=your-firebase-project-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

## File Storage (AWS S3)

```
Source: src/common/services/s3.service.ts
```

### Configuration

```
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

### Available Operations

- **Upload** — Upload a file buffer to S3
- **Download** — Download a file from S3
- **Presigned URL** — Generate a temporary URL for direct client upload/download
- **Delete** — Remove a file from S3

### File Upload Middleware

The `upload` middleware (`src/common/middlewares/upload.ts`) uses Multer for handling multipart form data:

```typescript
import { upload } from '../../common/middlewares/upload';

router.post('/avatar', authenticate, upload.single('file'), uploadAvatar);
```

## Mocking in Tests

Background jobs and external services are mocked in tests to avoid side effects:

```typescript
jest.mock('../../../src/common/queues', () => ({
  queueEmail: jest.fn().mockResolvedValue(undefined),
  queueBulkEmail: jest.fn().mockResolvedValue(undefined),
}));
```

## Related Docs

- [Architecture](./architecture.md) — Where queues fit in the boot sequence
- [Deployment](./deployment.md) — Running Agenda in Docker
