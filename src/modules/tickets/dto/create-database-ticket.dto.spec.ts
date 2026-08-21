import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateDatabaseTicketDto } from './create-database-ticket.dto';

function validateDto(
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  const instance = plainToInstance(CreateDatabaseTicketDto, payload);
  return validate(instance);
}

describe('CreateDatabaseTicketDto', () => {
  const baseDatabase = {
    assignee: 'Jane',
    department: 'Datacenter',
    subject: 'Read row',
    description: 'Please read',
    namespace: 'pcbox-api',
    deployment: 'pcbox-db',
    dbName: 'pcbox-db',
    sqlCode: 'SELECT 1;',
  };

  it('rejects a DATABASE ticket missing sqlCode with a validation error', async () => {
    const { sqlCode: _omit, ...withoutSqlCode } = baseDatabase;
    const errors = await validateDto(withoutSqlCode);
    expect(errors.some((error) => error.property === 'sqlCode')).toBe(true);
  });

  it('rejects sqlCode over the 5000-char cap with a validation error', async () => {
    const errors = await validateDto({
      ...baseDatabase,
      sqlCode: 'a'.repeat(5001),
    });
    expect(errors.some((error) => error.property === 'sqlCode')).toBe(true);
  });

  it('accepts a valid DATABASE ticket with zero validation errors', async () => {
    const errors = await validateDto(baseDatabase);
    expect(errors).toHaveLength(0);
  });
});
