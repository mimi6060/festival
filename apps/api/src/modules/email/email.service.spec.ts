/**
 * Email Service Unit Tests
 *
 * Comprehensive tests for email functionality including:
 * - sendEmail (success, failure, disabled service)
 * - sendTemplatedEmail with variables
 * - sendWelcomeEmail
 * - sendPasswordResetEmail
 * - sendTicketConfirmationEmail
 * - sendPaymentConfirmationEmail
 * - Template rendering with Handlebars
 * - SMTP verification
 * - Error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { EmailService, SendEmailOptions } from './email.service';

// ============================================================================
// Mock Setup
// ============================================================================

// Create mock functions that persist across test resets
const createMockTransporter = () => ({
  sendMail: jest.fn(),
  verify: jest.fn(),
});

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock handlebars - keep the actual registerHelper to test helpers
const originalHandlebars = jest.requireActual('handlebars');
jest.mock('handlebars', () => ({
  compile: jest.fn(),
  registerPartial: jest.fn(),
  registerHelper: jest.fn(),
}));

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTransporter: ReturnType<typeof createMockTransporter>;
  let mockCompiledTemplate: jest.Mock;

  const createMockConfigService = (overrides: Record<string, any> = {}) => ({
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 587,
        SMTP_USER: 'testuser',
        SMTP_PASS: 'testpass',
        SMTP_FROM: 'Festival Platform <noreply@festival.com>',
        SMTP_REPLY_TO: 'support@festival.com',
        SMTP_TLS_REJECT_UNAUTHORIZED: true,
        COMPANY_NAME: 'Festival Platform',
        WEBSITE_URL: 'https://festival.com',
        ...overrides,
      };
      return config[key] ?? defaultValue;
    }),
  });

  const setupMocks = () => {
    mockTransporter = createMockTransporter();
    mockCompiledTemplate = jest.fn().mockReturnValue('<html><body>Test Email</body></html>');

    // Setup nodemailer mock
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Setup fs mock for template loading
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockImplementation((dir: string) => {
      if (dir.includes('partials')) {
        return ['button.hbs', 'footer.hbs', 'header.hbs'];
      }
      if (dir.includes('layouts')) {
        return ['main.hbs'];
      }
      // Main templates directory - return only files, not directories
      return [
        'welcome.hbs',
        'password-reset.hbs',
        'verify-email.hbs',
        'ticket-confirmation.hbs',
        'payment-confirmation.hbs',
        'refund-confirmation.hbs',
        'cashless-topup.hbs',
        'staff-assignment.hbs',
        'support-response.hbs',
      ];
    });
    (fs.readFileSync as jest.Mock).mockReturnValue('{{userName}}');

    // Setup handlebars mock
    (handlebars.compile as jest.Mock).mockReturnValue(mockCompiledTemplate);
  };

  const createEmailService = async (configOverrides: Record<string, any> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: createMockConfigService(configOverrides) },
      ],
    }).compile();

    const service = module.get<EmailService>(EmailService);
    service.onModuleInit();
    return service;
  };

  beforeEach(async () => {
    setupMocks();
    emailService = await createEmailService();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('onModuleInit', () => {
    it('should initialize the transporter when SMTP is configured', () => {
      // Assert
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'testuser', pass: 'testpass' },
        tls: { rejectUnauthorized: true },
      });
      expect(emailService.isEmailEnabled()).toBe(true);
    });

    it('should not initialize transporter when SMTP host is missing', async () => {
      // Arrange
      setupMocks();
      const noHostConfig = {
        get: jest.fn((key: string) => {
          if (key === 'SMTP_HOST') {return undefined;}
          if (key === 'SMTP_PORT') {return 587;}
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: noHostConfig },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);
      service.onModuleInit();

      // Assert
      expect(service.isEmailEnabled()).toBe(false);
    });

    it('should load email templates from directory', () => {
      // Assert - templates should be loaded
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readdirSync).toHaveBeenCalled();
      expect(handlebars.compile).toHaveBeenCalled();
    });

    it('should register Handlebars helpers', () => {
      // Assert
      expect(handlebars.registerHelper).toHaveBeenCalledWith('formatDate', expect.any(Function));
      expect(handlebars.registerHelper).toHaveBeenCalledWith('formatCurrency', expect.any(Function));
      expect(handlebars.registerHelper).toHaveBeenCalledWith('ifEquals', expect.any(Function));
      expect(handlebars.registerHelper).toHaveBeenCalledWith('uppercase', expect.any(Function));
      expect(handlebars.registerHelper).toHaveBeenCalledWith('lowercase', expect.any(Function));
      expect(handlebars.registerHelper).toHaveBeenCalledWith('capitalize', expect.any(Function));
      expect(handlebars.registerHelper).toHaveBeenCalledWith('truncate', expect.any(Function));
    });

    it('should register Handlebars partials', () => {
      // Assert
      expect(handlebars.registerPartial).toHaveBeenCalledWith('button', expect.any(String));
      expect(handlebars.registerPartial).toHaveBeenCalledWith('footer', expect.any(String));
      expect(handlebars.registerPartial).toHaveBeenCalledWith('header', expect.any(String));
    });

    it('should use secure connection for port 465', async () => {
      // Arrange
      setupMocks();
      const secureConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            SMTP_HOST: 'smtp.example.com',
            SMTP_PORT: 465,
            SMTP_USER: 'testuser',
            SMTP_PASS: 'testpass',
            SMTP_TLS_REJECT_UNAUTHORIZED: true,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: secureConfig },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);
      service.onModuleInit();

      // Assert
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          secure: true,
        }),
      );
    });
  });

  // ==========================================================================
  // sendEmail Tests
  // ==========================================================================

  describe('sendEmail', () => {
    it('should successfully send an email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id-123' });
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: 'Test Subject',
        template: 'welcome',
        context: { userName: 'John' },
      };

      // Act
      const result = await emailService.sendEmail(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id-123');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Subject',
          from: 'Festival Platform <noreply@festival.com>',
        }),
      );
    });

    it('should return error when email service is disabled', async () => {
      // Arrange
      setupMocks();
      const noSmtpConfig = {
        get: jest.fn(() => undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: noSmtpConfig },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);
      service.onModuleInit();

      // Act
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        context: {},
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service is not configured');
    });

    it('should return error when template is not found', async () => {
      // Arrange
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: 'Test Subject',
        template: 'nonexistent-template',
        context: {},
      };

      // Act
      const result = await emailService.sendEmail(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain("Template 'nonexistent-template' not found");
    });

    it('should handle sendMail failure', async () => {
      // Arrange
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'));
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: 'Test Subject',
        template: 'welcome',
        context: {},
      };

      // Act
      const result = await emailService.sendEmail(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
    });

    it('should send email to multiple recipients', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'multi-recipient-id' });
      const options: SendEmailOptions = {
        to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        subject: 'Group Email',
        template: 'welcome',
        context: {},
      };

      // Act
      const result = await emailService.sendEmail(options);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        }),
      );
    });

    it('should include CC and BCC recipients', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'cc-bcc-id' });
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        context: {},
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
      };

      // Act
      const result = await emailService.sendEmail(options);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc@example.com',
          bcc: ['bcc1@example.com', 'bcc2@example.com'],
        }),
      );
    });

    it('should use custom replyTo when provided', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'reply-to-id' });
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        context: {},
        replyTo: 'custom-reply@example.com',
      };

      // Act
      const result = await emailService.sendEmail(options);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'custom-reply@example.com',
        }),
      );
    });

    it('should include attachments when provided', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'attachment-id' });
      const pdfBuffer = Buffer.from('PDF content');
      const options: SendEmailOptions = {
        to: 'user@example.com',
        subject: 'Test with attachment',
        template: 'welcome',
        context: {},
        attachments: [
          {
            filename: 'document.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      // Act
      const result = await emailService.sendEmail(options);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            expect.objectContaining({
              filename: 'document.pdf',
              content: pdfBuffer,
              contentType: 'application/pdf',
            }),
          ],
        }),
      );
    });

    it('should generate plain text version from HTML', async () => {
      // Arrange
      mockCompiledTemplate.mockReturnValue('<html><body><p>Hello</p><style>.test{}</style></body></html>');
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'text-version-id' });

      // Act
      await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        context: {},
      });

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.any(String),
          text: expect.any(String),
        }),
      );
    });

    it('should add currentYear and company info to template context', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'context-id' });

      // Act
      await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        context: { userName: 'John' },
      });

      // Assert
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'John',
          currentYear: new Date().getFullYear(),
          companyName: 'Festival Platform',
          websiteUrl: 'https://festival.com',
        }),
      );
    });
  });

  // ==========================================================================
  // sendWelcomeEmail Tests
  // ==========================================================================

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct parameters', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'welcome-id' });
      const context = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };

      // Act
      const result = await emailService.sendWelcomeEmail('john.doe@example.com', context);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        }),
      );
    });

    it('should use correct subject for welcome email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'welcome-subject-id' });

      // Act
      await emailService.sendWelcomeEmail('user@example.com', {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      });

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Bienvenue sur Festival Platform!',
        }),
      );
    });
  });

  // ==========================================================================
  // sendPasswordResetEmail Tests
  // ==========================================================================

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct parameters', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'reset-id' });
      const context = {
        firstName: 'John',
        resetUrl: 'https://festival.com/reset/token123',
        expiresIn: '1 hour',
      };

      // Act
      const result = await emailService.sendPasswordResetEmail('john@example.com', context);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          resetUrl: 'https://festival.com/reset/token123',
          expiresIn: '1 hour',
        }),
      );
    });

    it('should use correct subject for password reset email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'reset-subject-id' });

      // Act
      await emailService.sendPasswordResetEmail('user@example.com', {
        firstName: 'User',
        resetUrl: 'https://example.com/reset',
        expiresIn: '30 minutes',
      });

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Reinitialisation de votre mot de passe',
        }),
      );
    });
  });

  // ==========================================================================
  // sendVerificationEmail Tests
  // ==========================================================================

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct parameters', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'verify-id' });
      const context = {
        firstName: 'Alice',
        verificationUrl: 'https://festival.com/verify/token456',
        expiresIn: '24 hours',
      };

      // Act
      const result = await emailService.sendVerificationEmail('alice@example.com', context);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Alice',
          verificationUrl: 'https://festival.com/verify/token456',
        }),
      );
    });

    it('should use correct subject for verification email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'verify-subject-id' });

      // Act
      await emailService.sendVerificationEmail('user@example.com', {
        firstName: 'User',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
      });

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Verifiez votre adresse email',
        }),
      );
    });
  });

  // ==========================================================================
  // sendTicketConfirmationEmail Tests
  // ==========================================================================

  describe('sendTicketConfirmationEmail', () => {
    const ticketContext = {
      firstName: 'John',
      lastName: 'Doe',
      festivalName: 'Summer Festival 2024',
      ticketType: 'VIP Pass',
      ticketCode: 'TKT-2024-001',
      eventDate: new Date('2024-07-15'),
      eventLocation: 'Central Park, New York',
      purchasePrice: 150,
      currency: 'EUR',
    };

    it('should send ticket confirmation email with correct parameters', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'ticket-id' });

      // Act
      const result = await emailService.sendTicketConfirmationEmail('john@example.com', ticketContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          festivalName: 'Summer Festival 2024',
          ticketType: 'VIP Pass',
          ticketCode: 'TKT-2024-001',
        }),
      );
    });

    it('should use festival name in subject', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'ticket-subject-id' });

      // Act
      await emailService.sendTicketConfirmationEmail('john@example.com', ticketContext);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Votre billet pour Summer Festival 2024',
        }),
      );
    });

    it('should include PDF attachment when provided', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'ticket-pdf-id' });
      const pdfBuffer = Buffer.from('PDF ticket content');

      // Act
      const result = await emailService.sendTicketConfirmationEmail(
        'john@example.com',
        ticketContext,
        pdfBuffer,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            expect.objectContaining({
              filename: 'ticket-TKT-2024-001.pdf',
              content: pdfBuffer,
              contentType: 'application/pdf',
            }),
          ],
        }),
      );
    });

    it('should send without attachment when PDF is not provided', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'ticket-no-pdf-id' });

      // Act
      await emailService.sendTicketConfirmationEmail('john@example.com', ticketContext);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: undefined,
        }),
      );
    });
  });

  // ==========================================================================
  // sendPaymentConfirmationEmail Tests
  // ==========================================================================

  describe('sendPaymentConfirmationEmail', () => {
    const paymentContext = {
      firstName: 'Jane',
      lastName: 'Smith',
      paymentId: 'PAY-2024-123456',
      amount: 300,
      currency: 'EUR',
      paymentMethod: 'Credit Card',
      items: [
        { name: 'VIP Ticket', quantity: 2, price: 150 },
      ],
      festivalName: 'Summer Festival 2024',
    };

    it('should send payment confirmation email with correct parameters', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'payment-id' });

      // Act
      const result = await emailService.sendPaymentConfirmationEmail('jane@example.com', paymentContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          paymentId: 'PAY-2024-123456',
          amount: 300,
          totalAmount: 300,
        }),
      );
    });

    it('should use correct subject for payment confirmation', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'payment-subject-id' });

      // Act
      await emailService.sendPaymentConfirmationEmail('jane@example.com', paymentContext);

      // Assert
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Confirmation de paiement',
        }),
      );
    });

    it('should include invoice PDF attachment when provided', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'payment-invoice-id' });
      const invoicePdf = Buffer.from('Invoice PDF content');

      // Act
      const result = await emailService.sendPaymentConfirmationEmail(
        'jane@example.com',
        paymentContext,
        invoicePdf,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            expect.objectContaining({
              filename: 'facture-PAY-2024.pdf',
              content: invoicePdf,
              contentType: 'application/pdf',
            }),
          ],
        }),
      );
    });
  });

  // ==========================================================================
  // sendRefundConfirmationEmail Tests
  // ==========================================================================

  describe('sendRefundConfirmationEmail', () => {
    it('should send refund confirmation email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'refund-id' });
      const context = {
        firstName: 'Bob',
        lastName: 'Wilson',
        refundId: 'REF-2024-001',
        amount: 75,
        currency: 'EUR',
        reason: 'Event cancellation',
        festivalName: 'Summer Festival 2024',
      };

      // Act
      const result = await emailService.sendRefundConfirmationEmail('bob@example.com', context);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Confirmation de remboursement',
        }),
      );
    });
  });

  // ==========================================================================
  // sendCashlessTopupEmail Tests
  // ==========================================================================

  describe('sendCashlessTopupEmail', () => {
    it('should send cashless topup confirmation email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'topup-id' });
      const context = {
        firstName: 'Charlie',
        amount: 50,
        currency: 'EUR',
        newBalance: 150,
        festivalName: 'Summer Festival 2024',
      };

      // Act
      const result = await emailService.sendCashlessTopupEmail('charlie@example.com', context);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Recharge cashless confirmee',
        }),
      );
      expect(mockCompiledTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Charlie',
          amount: 50,
          newBalance: 150,
        }),
      );
    });
  });

  // ==========================================================================
  // sendStaffAssignmentEmail Tests
  // ==========================================================================

  describe('sendStaffAssignmentEmail', () => {
    it('should send staff assignment notification email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'staff-id' });
      const context = {
        firstName: 'David',
        lastName: 'Brown',
        festivalName: 'Summer Festival 2024',
        role: 'Security',
        department: 'Security Operations',
        startDate: new Date('2024-07-15'),
        endDate: new Date('2024-07-17'),
        zone: 'Main Stage',
      };

      // Act
      const result = await emailService.sendStaffAssignmentEmail('david@example.com', context);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Affectation staff - Summer Festival 2024',
        }),
      );
    });
  });

  // ==========================================================================
  // sendSupportTicketResponseEmail Tests
  // ==========================================================================

  describe('sendSupportTicketResponseEmail', () => {
    it('should send support ticket response email', async () => {
      // Arrange
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'support-id' });
      const context = {
        firstName: 'Eve',
        ticketId: 'SUPP-001',
        ticketSubject: 'Refund Request',
        responseMessage: 'Your refund has been processed.',
        staffName: 'Support Team',
      };

      // Act
      const result = await emailService.sendSupportTicketResponseEmail('eve@example.com', context);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Re: Refund Request',
        }),
      );
    });
  });

  // ==========================================================================
  // verifyConnection Tests
  // ==========================================================================

  describe('verifyConnection', () => {
    it('should return true when SMTP connection is successful', async () => {
      // Arrange
      mockTransporter.verify.mockResolvedValue(true);

      // Act
      const result = await emailService.verifyConnection();

      // Assert
      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should return false when SMTP verification fails', async () => {
      // Arrange
      mockTransporter.verify.mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await emailService.verifyConnection();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when transporter is not initialized', async () => {
      // Arrange
      setupMocks();
      const noSmtpConfig = {
        get: jest.fn(() => undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: noSmtpConfig },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);
      service.onModuleInit();

      // Act
      const result = await service.verifyConnection();

      // Assert
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // isEmailEnabled Tests
  // ==========================================================================

  describe('isEmailEnabled', () => {
    it('should return true when email service is configured', () => {
      // Assert
      expect(emailService.isEmailEnabled()).toBe(true);
    });

    it('should return false when email service is not configured', async () => {
      // Arrange
      setupMocks();
      const noSmtpConfig = {
        get: jest.fn(() => undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: noSmtpConfig },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);
      service.onModuleInit();

      // Assert
      expect(service.isEmailEnabled()).toBe(false);
    });
  });

  // ==========================================================================
  // Handlebars Helper Tests
  // ==========================================================================

  describe('Handlebars helpers', () => {
    // We need to capture the helper functions from the mock calls
    let formatDateHelper: (...args: any[]) => string;
    let formatCurrencyHelper: (amount: number, currency?: string) => string;
    let uppercaseHelper: (str: string) => string;
    let lowercaseHelper: (str: string) => string;
    let capitalizeHelper: (str: string) => string;
    let truncateHelper: (str: string, length: number) => string;

    beforeEach(() => {
      // Get the helper functions from the registerHelper mock calls
      const registerHelperMock = handlebars.registerHelper as jest.Mock;
      const calls = registerHelperMock.mock.calls;

      formatDateHelper = calls.find((call: any[]) => call[0] === 'formatDate')?.[1];
      formatCurrencyHelper = calls.find((call: any[]) => call[0] === 'formatCurrency')?.[1];
      uppercaseHelper = calls.find((call: any[]) => call[0] === 'uppercase')?.[1];
      lowercaseHelper = calls.find((call: any[]) => call[0] === 'lowercase')?.[1];
      capitalizeHelper = calls.find((call: any[]) => call[0] === 'capitalize')?.[1];
      truncateHelper = calls.find((call: any[]) => call[0] === 'truncate')?.[1];
    });

    describe('formatDate', () => {
      it('should format date with short format', () => {
        const date = new Date('2024-07-15');
        const result = formatDateHelper(date, 'short');
        expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      });

      it('should format date with long format', () => {
        const date = new Date('2024-07-15');
        const result = formatDateHelper(date, 'long');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });

      it('should format date with datetime format', () => {
        const date = new Date('2024-07-15T14:30:00');
        const result = formatDateHelper(date, 'datetime');
        expect(typeof result).toBe('string');
      });

      it('should format date with time format', () => {
        const date = new Date('2024-07-15T14:30:00');
        const result = formatDateHelper(date, 'time');
        expect(result).toMatch(/\d{2}:\d{2}/);
      });

      it('should return empty string for null date', () => {
        const result = formatDateHelper(null, 'short');
        expect(result).toBe('');
      });
    });

    describe('formatCurrency', () => {
      it('should format amount in EUR by default', () => {
        const result = formatCurrencyHelper(100, 'EUR');
        expect(result).toContain('100');
      });

      it('should return empty string for undefined amount', () => {
        const result = formatCurrencyHelper(undefined as any, 'EUR');
        expect(result).toBe('');
      });

      it('should return empty string for null amount', () => {
        const result = formatCurrencyHelper(null as any, 'EUR');
        expect(result).toBe('');
      });
    });

    describe('uppercase', () => {
      it('should convert string to uppercase', () => {
        const result = uppercaseHelper('hello');
        expect(result).toBe('HELLO');
      });

      it('should return empty string for falsy input', () => {
        const result = uppercaseHelper('');
        expect(result).toBe('');
      });
    });

    describe('lowercase', () => {
      it('should convert string to lowercase', () => {
        const result = lowercaseHelper('HELLO');
        expect(result).toBe('hello');
      });

      it('should return empty string for falsy input', () => {
        const result = lowercaseHelper('');
        expect(result).toBe('');
      });
    });

    describe('capitalize', () => {
      it('should capitalize first letter', () => {
        const result = capitalizeHelper('hello world');
        expect(result).toBe('Hello world');
      });

      it('should handle already uppercase string', () => {
        const result = capitalizeHelper('HELLO');
        expect(result).toBe('Hello');
      });

      it('should return empty string for falsy input', () => {
        const result = capitalizeHelper('');
        expect(result).toBe('');
      });
    });

    describe('truncate', () => {
      it('should truncate string longer than limit', () => {
        const result = truncateHelper('Hello World', 5);
        expect(result).toBe('Hello...');
      });

      it('should not truncate string shorter than limit', () => {
        const result = truncateHelper('Hi', 5);
        expect(result).toBe('Hi');
      });

      it('should return empty string for falsy input', () => {
        const result = truncateHelper('', 5);
        expect(result).toBe('');
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should handle template directory not found', async () => {
      // Arrange
      setupMocks();
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: createMockConfigService() },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);

      // Act - should not throw
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should handle transporter creation failure', async () => {
      // Arrange
      setupMocks();
      (nodemailer.createTransport as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create transporter');
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: createMockConfigService() },
        ],
      }).compile();

      const service = module.get<EmailService>(EmailService);

      // Act - should not throw
      expect(() => service.onModuleInit()).not.toThrow();
      expect(service.isEmailEnabled()).toBe(false);
    });

    it('should handle non-Error exceptions in sendEmail', async () => {
      // Arrange
      mockTransporter.sendMail.mockRejectedValue('String error');

      // Act
      const result = await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        template: 'welcome',
        context: {},
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });
});
