import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { KubernetesExecutionType } from '../../../common/database/ticket/kubernetes-execution-type.enum';
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
    codeYaml: 'apiVersion: apps/v1',
  };

  it('rejects a KUBERNETES ticket missing codeYaml with a validation error', async () => {
    const { codeYaml: _codeYaml, ...withoutCodeYaml } = baseKubernetes;
    const errors = await validateDto({
      ...withoutCodeYaml,
      executionType: KubernetesExecutionType.MANIFEST,
    });
    expect(errors.some((error) => error.property === 'codeYaml')).toBe(true);
  });

  it('rejects a KUBERNETES ticket missing executionType with a validation error', async () => {
    const errors = await validateDto(baseKubernetes);
    expect(errors.some((error) => error.property === 'executionType')).toBe(
      true,
    );
  });

  it('rejects a KUBERNETES ticket with an executionType outside the enum', async () => {
    const errors = await validateDto({
      ...baseKubernetes,
      executionType: 'SOMETHING_ELSE',
    });
    expect(errors.some((error) => error.property === 'executionType')).toBe(
      true,
    );
  });

  it('accepts a valid KUBERNETES ticket with executionType MANIFEST and zero validation errors', async () => {
    const errors = await validateDto({
      ...baseKubernetes,
      executionType: KubernetesExecutionType.MANIFEST,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid KUBERNETES ticket with executionType ANSIBLE and zero validation errors', async () => {
    const errors = await validateDto({
      ...baseKubernetes,
      executionType: KubernetesExecutionType.ANSIBLE,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts a codeYaml longer than the former 500-character cap', async () => {
    const errors = await validateDto({
      ...baseKubernetes,
      codeYaml: 'a'.repeat(5001),
      executionType: KubernetesExecutionType.MANIFEST,
    });
    expect(errors).toHaveLength(0);
  });
});
