import * as kubernetes from '@pulumi/kubernetes'
import * as nginx from '@pulumi/kubernetes-ingress-nginx'
import * as pulumi from '@pulumi/pulumi'

export class Ingress extends pulumi.ComponentResource {
  constructor(opts?: pulumi.ComponentResourceOptions) {
    super('homelab:networking:Ingress', 'ingress', opts);

    // Create child resources with parent reference
    const namespace = new kubernetes.core.v1.Namespace(
      'nginx-ingress',
      {
        metadata: {
          name: 'nginx-ingress',
        },
      },
      { parent: this },
    ); // Specify this component as parent

    new nginx.IngressController(
      'nginx-ingress-ctrl',
      {
        controller: {
          publishService: {
            enabled: true,
          },
        },
        helmOptions: {
          namespace: namespace.metadata.name,
          name: 'nginx-ingress',
          values: {
            resources: {
              requests: {
                cpu: '100m',
                memory: '128Mi',
              },
              limits: {
                cpu: '200m',
                memory: '256Mi',
              },
            },
          },
        },
      },
      { parent: this },
    );
  }
}
