/**
 * How a `kubernetes_tickets` row gets executed by pcbox-api at approval
 * time — `MANIFEST` keeps hitting pcbox-api's existing `POST /kubernetes`
 * (raw `code_yaml` applied as-is), `ANSIBLE` routes to the new
 * `POST /kubernetes/ansible` (same body shape, playbook-driven execution).
 * See `PcboxApiService.sendToConnector`.
 */
export enum KubernetesExecutionType {
  ANSIBLE = 'ANSIBLE',
  MANIFEST = 'MANIFEST',
}
