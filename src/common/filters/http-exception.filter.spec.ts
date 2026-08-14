import { ArgumentsHost, ConflictException } from '@nestjs/common';
import { InternalServerErrorException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from './http-exception.filter';

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

describe('HttpExceptionFilter', () => {
  it('logs a 4xx as warn and forwards the exact response Nest would send by default', () => {
    const warnSpy = jest.fn();
    const errorSpy = jest.fn();
    const logger = { warn: warnSpy, error: errorSpy } as unknown as Logger;
    const filter = new HttpExceptionFilter(logger);

    const exception = new ConflictException('Email already in use');
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    filter.catch(exception, buildHost({ status, json }));

    expect(warnSpy).toHaveBeenCalledWith({
      err: { message: exception.message, stack: exception.stack },
      errorType: 'ConflictException',
      statusCode: 409,
      details: exception.getResponse(),
      msg: 'HTTP exception',
    });
    expect(errorSpy).not.toHaveBeenCalled();

    expect(status).toHaveBeenCalledWith(409);
    // Untouched — this is the whole point, unlike DatabaseExceptionFilter.
    expect(json).toHaveBeenCalledWith(exception.getResponse());
  });

  it('logs a 5xx as error', () => {
    const warnSpy = jest.fn();
    const errorSpy = jest.fn();
    const logger = { warn: warnSpy, error: errorSpy } as unknown as Logger;
    const filter = new HttpExceptionFilter(logger);

    const exception = new InternalServerErrorException('Something broke');
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    filter.catch(exception, buildHost({ status, json }));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
