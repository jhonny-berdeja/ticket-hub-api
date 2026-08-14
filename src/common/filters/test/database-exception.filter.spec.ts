import { ArgumentsHost } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { QueryFailedError } from 'typeorm';
import { DatabaseExceptionFilter } from '../database-exception.filter';

function buildHost(response: {
  status: jest.Mock;
  json: jest.Mock;
}): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
}

describe('DatabaseExceptionFilter', () => {
  it('logs a safe, hand-built err object plus the query — never the raw exception', () => {
    const errorSpy = jest.fn();
    const logger = { error: errorSpy } as unknown as Logger;
    const filter = new DatabaseExceptionFilter(logger);

    const exception = new QueryFailedError(
      'SELECT * FROM users WHERE email = $1',
      ['smoke-test@example.com'],
      new Error('connection terminated unexpectedly'),
    );
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const response = { status, json };

    filter.catch(exception, buildHost(response));

    // Called with a single object — no second string argument. nestjs-pino's
    // Logger treats a trailing string as `context`, not `msg` (Nest's
    // LoggerService convention, not pino's native (obj, msg)); `msg` has to
    // be a key inside the object instead, see the filter's own comment.
    // method/url/req.id are NOT asserted here either: they come from
    // pino-http's own req binding on the same request-scoped logger (see
    // logger.config.ts), nothing this filter controls or needs to duplicate.
    expect(errorSpy).toHaveBeenCalledWith({
      err: { message: exception.message, stack: exception.stack },
      errorType: 'QueryFailedError',
      query: exception.query,
      msg: 'Database error',
    });

    // The whole point: `err` must NOT be the raw exception instance — pino's
    // default error serializer walks every enumerable property of whatever
    // it's given, so passing the real QueryFailedError would leak
    // `.parameters` (bound values, e.g. the plaintext email above) and
    // `.driverError` regardless of any `redact` rule. Asserting the exact
    // object above already proves this, but spelling it out here protects
    // against a future edit "simplifying" this back to `err: exception`.
    const [loggedObject] = errorSpy.mock.calls[0] as [Record<string, unknown>];
    expect(loggedObject.err).not.toBe(exception);
    expect(JSON.stringify(loggedObject)).not.toContain(
      'smoke-test@example.com',
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'An unexpected error occurred. Please try again later.',
    });
    // The client response must never contain the query or anything from
    // the original exception's message.
    const [responseBody] = json.mock.calls[0] as [Record<string, unknown>];
    expect(JSON.stringify(responseBody)).not.toContain('SELECT');
    expect(JSON.stringify(responseBody)).not.toContain(
      'smoke-test@example.com',
    );
  });
});
