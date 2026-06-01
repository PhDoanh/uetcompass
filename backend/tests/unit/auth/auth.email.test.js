const { sendRegistrationOtpEmail } = require('../../../src/modules/auth/auth.email');

describe('auth email (brevo)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_NAME;
    delete process.env.BREVO_SENDER_EMAIL;
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('throws when Brevo config missing', async () => {
    await expect(sendRegistrationOtpEmail('test@vnu.edu.vn', '1234')).rejects.toMatchObject({
      status: 503,
      code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('throws when Brevo returns error', async () => {
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_SENDER_NAME = 'UETCompass';
    process.env.BREVO_SENDER_EMAIL = 'no-reply@uetcompass.test';

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: jest.fn().mockResolvedValue('Forbidden'),
    });

    await expect(sendRegistrationOtpEmail('test@vnu.edu.vn', '1234')).rejects.toMatchObject({
      status: 502,
      code: 'EMAIL_PROVIDER_ERROR',
    });
  });

  test('sends email via Brevo', async () => {
    process.env.BREVO_API_KEY = 'test-key';
    process.env.BREVO_SENDER_NAME = 'UETCompass';
    process.env.BREVO_SENDER_EMAIL = 'no-reply@uetcompass.test';

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: jest.fn().mockResolvedValue('{}'),
    });

    await expect(sendRegistrationOtpEmail('test@vnu.edu.vn', '1234')).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': 'test-key',
      },
      body: JSON.stringify({
        sender: {
          name: 'UETCompass',
          email: 'no-reply@uetcompass.test',
        },
        to: [{ email: 'test@vnu.edu.vn' }],
        subject: 'UETCompass - Verify your account',
        textContent: 'Your verification code is 1234. It expires in 2 minutes.',
        htmlContent: '<p>Your verification code is <b>1234</b>. It expires in 2 minutes.</p>',
      }),
    });
  });
});
