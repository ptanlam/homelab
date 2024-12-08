import * as kubernetes from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'

export class ClusterSecret extends pulumi.ComponentResource {
  constructor(args?: pulumi.Inputs, opts?: pulumi.ComponentResourceOptions) {
    super('homelab:system:ClusterSecret', 'cluster-secret', args, opts);

    new kubernetes.helm.v3.Release(
      'cluster-secret',
      {
        chart: 'cluster-secret',
        namespace: 'kube-system',
        createNamespace: false,
        repositoryOpts: {
          repo: 'https://charts.clustersecret.com',
        },
      },
      { parent: this },
    );
  }
}
