import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateAnsibleTicketDto } from './create-ansible-ticket.dto';

function validateDto(
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  const instance = plainToInstance(CreateAnsibleTicketDto, payload);
  return validate(instance);
}

describe('CreateAnsibleTicketDto', () => {
  const baseAnsible = {
    assignee: 'Jane',
    department: 'Datacenter',
    subject: 'Restart pod',
    description: 'Please restart',
  };

  it('rejects an ANSIBLE ticket missing codeAnsible with a validation error', async () => {
    const errors = await validateDto(baseAnsible);
    expect(errors.some((error) => error.property === 'codeAnsible')).toBe(true);
  });

  it('accepts a valid ANSIBLE ticket with zero validation errors', async () => {
    const errors = await validateDto({
      ...baseAnsible,
      codeAnsible: '- hosts: all',
    });
    expect(errors).toHaveLength(0);
  });
});
