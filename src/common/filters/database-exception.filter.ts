import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Logger } from 'nestjs-pino';
import { TypeORMError } from 'typeorm';

/** Shown to the client instead of whatever TypeORM/the driver actually said — never leaks table/column names, SQL, or connection details. */
const GENERIC_MESSAGE = 'An unexpected error occurred. Please try again later.';

@Catch(TypeORMError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: TypeORMError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error({

      err: {
        message: exception.message,
        stack: exception.stack,
      },
      errorType: exception.constructor.name,
      query: (exception as { query?: string }).query,
      msg: 'Database error',
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: GENERIC_MESSAGE,
    });
  }
}
