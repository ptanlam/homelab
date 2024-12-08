import * as path from 'path'
import { cwd } from 'process'

import * as kubernetes from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'

export interface MonitoringArgs extends pulumi.Inputs {
  rootCaCert: kubernetes.apiextensions.CustomResource;
}

export class Monitoring extends pulumi.ComponentResource {
  constructor(args: MonitoringArgs, opts?: pulumi.ComponentResourceOptions) {
    super('homelab:monitoring:Monitoring', 'monitoring', args, opts);

    const { rootCaCert } = args;

    // Create child resources with parent reference
    const namespace = new kubernetes.core.v1.Namespace(
      'monitoring',
      {
        metadata: {
          name: 'monitoring',
        },
      },
      { parent: this },
    ); // Specify this component as parent

    new kubernetes.apiextensions.CustomResource(
      'monitoring-ca',
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Issuer',
        metadata: {
          name: 'monitoring-ca',
          namespace: namespace.metadata.name,
        },
        spec: {
          ca: {
            secretName: rootCaCert.metadata.name,
          },
        },
      },
      { dependsOn: [rootCaCert, namespace], parent: this },
    );

    const prometheus = new kubernetes.helm.v3.Release(
      'prometheus',
      {
        chart: path.join(cwd(), '_charts/prometheus'),
        namespace: namespace.metadata.name,
        values: {
          server: {
            resources: {
              requests: {
                cpu: '500m',
                memory: '512Mi',
              },
              limits: {
                cpu: '1000m',
                memory: '1Gi',
              },
            },
            retention: '15d', // Data retention period
            persistentVolume: {
              size: '10Gi',
              storageClass: 'longhorn',
            },
            ingress: {
              enabled: true,
              ingressClassName: 'nginx',
              annotations: {
                'cert-manager.io/issuer': 'monitoring-ca',
              },
              hosts: ['prometheus.home'],
              path: '/',
              tls: [
                {
                  hosts: ['prometheus.home'],
                  secretName: 'prometheus-tls',
                },
              ],
            },
          },
          alertmanager: {
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
            persistentVolume: {
              size: '2Gi',
              storageClass: 'longhorn',
            },
          },
        },
      },
      { dependsOn: [namespace], parent: this },
    );

    const grafana = new kubernetes.helm.v3.Release(
      'grafana',
      {
        chart: path.join(cwd(), '_charts/grafana'),
        namespace: namespace.metadata.name,
        values: {
          server: {
            persistenceVolume: {
              enabled: true,
              size: '10Gi',
              storageClass: 'longhorn',
            },
          },

          ingress: {
            enabled: true,
            ingressClassName: 'nginx',
            annotations: {
              'cert-manager.io/issuer': 'monitoring-ca',
            },
            hosts: ['grafana.home'],
            path: '/',
            tls: [{ hosts: ['grafana.home'], secretName: 'grafana-tls' }],
          },
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
      { dependsOn: [namespace], parent: this },
    );

    const uptimeKuma = new kubernetes.helm.v3.Release(
      'uptime-kuma',
      {
        chart: path.join(cwd(), '_charts/uptime-kuma'),
        namespace: namespace.metadata.name,
        values: {
          ingress: {
            enabled: false,
          },
          volume: {
            enabled: true,
            size: '10Gi',
          },
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
      { dependsOn: [namespace], parent: this },
    );

    const uptimeKumaIngress = new kubernetes.networking.v1.Ingress(
      'uptime-kuma-ingress',
      {
        metadata: {
          name: uptimeKuma.name,
          namespace: namespace.metadata.name,
          annotations: {
            'cert-manager.io/issuer': 'monitoring-ca',
          },
        },

        spec: {
          ingressClassName: 'nginx',
          rules: [
            {
              host: 'uptime.home',
              http: {
                paths: [
                  {
                    path: '/',
                    pathType: 'ImplementationSpecific',
                    backend: { service: { name: uptimeKuma.name, port: { number: 3001 } } },
                  },
                ],
              },
            },
          ],
          tls: [{ hosts: ['uptime.home'], secretName: 'uptime-kuma-tls' }],
        },
      },
      { dependsOn: [uptimeKuma], parent: this },
    );

    // Register outputs
    this.registerOutputs({
      namespace: namespace,
      prometheus: prometheus,
      grafana: grafana,
      uptimeKuma: uptimeKuma,
    });
  }
}
