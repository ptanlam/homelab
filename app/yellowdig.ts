import * as kubernetes from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'

export class Yellowdig extends pulumi.ComponentResource {
  constructor(args: pulumi.Inputs, opts?: pulumi.ComponentResourceOptions) {
    super('homelab:app:yellowdig', 'yellowdig', args, opts);

    // Namespace
    const namespace = new kubernetes.core.v1.Namespace(
      'yellowdig',
      {
        metadata: {
          name: 'ci',
        },
      },
      { parent: this },
    );

    const ca = new kubernetes.apiextensions.CustomResource(
      'yd-ci-ca',
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Issuer',
        metadata: {
          name: 'yd-ci-intermediate-ca',
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
  }
}
