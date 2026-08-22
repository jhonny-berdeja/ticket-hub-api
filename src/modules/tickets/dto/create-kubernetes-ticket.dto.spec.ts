import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateKubernetesTicketDto } from './create-kubernetes-ticket.dto';

function validateDto(
  payload: Record<string, unknown>,
): Promise<ValidationError[]> {
  const instance = plainToInstance(CreateKubernetesTicketDto, payload);
  return validate(instance);
}

describe('CreateKubernetesTicketDto', () => {
  const baseKubernetes = {
    assignee: 'Jane',
    department: 'Datacenter',
    subject: 'Deploy pod',
    description: 'Please deploy',
  };

  it('rejects a KUBERNETES ticket missing codeYaml with a validation error', async () => {
    const errors = await validateDto(baseKubernetes);
    expect(errors.some((error) => error.property === 'codeYaml')).toBe(true);
  });

  it('accepts a valid KUBERNETES ticket with zero validation errors', async () => {
    const errors = await validateDto({
      ...baseKubernetes,
      codeYaml: 'apiVersion: apps/v1',
    });
    expect(errors).toHaveLength(0);
  });
});
