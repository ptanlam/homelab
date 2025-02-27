import * as path from 'path'
import { cwd } from 'process'

import * as kubernetes from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'

export class LocalStack extends pulumi.ComponentResource {
  constructor(args: pulumi.Inputs, opts?: pulumi.ComponentResourceOptions) {
    super('homelab:app:LocalStack', 'localstack', args, opts);

    const namespace = new kubernetes.core.v1.Namespace(
      'localstack',
      {
        metadata: {
          name: 'localstack',
        },
      },
      { parent: this },
    );

    const ca = new kubernetes.apiextensions.CustomResource(
      'localstack-ca',
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Issuer',
        metadata: {
          name: 'localstack-ca',
          namespace: namespace.metadata.name,
        },
        spec: {
          ca: {
            secretName: 'root-ca-cert',
          },
        },
      },
      { dependsOn: [namespace], parent: this },
    );

    new kubernetes.helm.v3.Release(
      'localstack',
      {
        chart: `${path.join(cwd(), '_charts/localstack')}`,
        name: 'localstack',
        namespace: namespace.metadata.name,
        values: {
          debug: true,
          ingress: {
            enabled: true,
            annotations: {
              'cert-manager.io/issuer': `localstack-ca`,
            },
            ingressClassName: 'nginx',
            hosts: [
              {
                host: 'localstack.home',
                paths: [{ path: '/', pathType: 'Prefix' }],
              },
            ],
            tls: [
              {
                hosts: [`localstack.home`],
                secretName: `localstack-tls`,
              },
            ],
          },
          persistence: {
            enabled: true,
            size: '10Gi',
            storageClass: 'longhorn',
          },
        },
      },
      { dependsOn: [namespace, ca] },
    );
  }
}
