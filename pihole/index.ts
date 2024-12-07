import * as kubernetes from '@pulumi/kubernetes'

new kubernetes.helm.v3.Release('pihole', {
  chart: 'pihole',
  namespace: 'pihole',
  createNamespace: true,
  repositoryOpts: {
    repo: 'https://mojo2600.github.io/pihole-kubernetes/',
  },
});
