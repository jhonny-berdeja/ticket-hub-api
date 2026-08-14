import { buildLoggerOptions } from './logger.config';

describe('buildLoggerOptions', () => {
  it('sets the pino level from the given value', () => {
    const options = buildLoggerOptions('debug');

    expect(options.pinoHttp.level).toBe('debug');
  });

  it('redacts headers/body fields that can carry credentials', () => {
    const options = buildLoggerOptions('info');
    const redact = options.pinoHttp.redact;

    if (Array.isArray(redact) || !redact) {
      throw new Error('expected redact to be a redactOptions object');
    }

    expect(redact.paths).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'req.body.password',
        'req.body.access_token',
      ]),
    );
  });
});
