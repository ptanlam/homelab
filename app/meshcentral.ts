import * as path from 'path'
import { cwd } from 'process'

import * as kubernetes from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'

// Increase inotify limits on host machine
// sudo sysctl fs.inotify.max_user_instances=1280
// sudo sysctl fs.inotify.max_user_watches=655360

export class MeshCentral extends pulumi.ComponentResource {
  constructor(args: pulumi.Inputs, opts?: pulumi.ComponentResourceOptions) {
    super('homelab:app:meshcentral', 'meshcentral', args, opts);

    // Namespace
    const namespace = new kubernetes.core.v1.Namespace(
      'meshcentral',
      {
        metadata: {
          name: 'meshcentral',
        },
      },
      { parent: this },
    );

    const ca = new kubernetes.apiextensions.CustomResource(
      'meshcentral-ca',
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Issuer',
        metadata: {
          name: 'meshcentral-ca',
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

    // MongoDB Replica Set
    const mongoDb = new kubernetes.helm.v3.Release(
      'mongodb',
      {
        chart: `${path.join(cwd(), '_charts/mongodb')}`,
        namespace: namespace.metadata.name,
        values: {
          architecture: 'replicaset',
          replicaCount: 2,

          auth: {
            username: 'meshcentral',
            password: 'meshcentral',
            database: 'meshcentral',
          },

          podSecurityContext: {
            enabled: true,
            fsGroup: 1001,
          },

          containerSecurityContext: {
            enabled: true,
            runAsUser: 1001,
          },

          persistence: {
            storageClass: 'longhorn',
            size: '10Gi',
          },
        },
      },
      { dependsOn: [namespace], parent: this },
    );

    // MeshCentral Servers
    const configMap = new kubernetes.core.v1.ConfigMap(
      'meshcentral-config',
      {
        metadata: {
          name: 'meshcentral-config',
          namespace: namespace.metadata.name,
        },
        data: {
          'config.json': mongoDb.name.apply((name) =>
            JSON.stringify({
              $schema: 'https://raw.githubusercontent.com/Ylianst/MeshCentral/master/meshcentral-config-schema.json',
              settings: {
                plugins: { enabled: true },
                MongoDB: `mongodb://meshcentral:meshcentral@${name}-headless:27017/meshcentral?authSource=meshcentral`,
                // mongoDbChangeStream: true,
                cert: 'meshcentral.home',
                AliasPort: 443,
                Port: 4430,
                redirPort: 80,
                AgentPong: 300,
                TLSOffload: true,
                SelfUpdate: false,
                AllowFraming: false,
                WebRTC: false,
                WANonly: true,
              },

              domains: {
                '': {
                  minify: true,
                  NewAccounts: true,
                  localSessionRecording: false,
                },
              },
              // peers: {
              //   serverId: 'meshcentral-1',
              //   servers: {
              //     server1: { url: 'wss://meshcentral-1:442/' },
              //     server2: { url: 'wss://meshcentral-2:443/' },
              //   },
              // },
            }),
          ),
        },
      },
      { dependsOn: [namespace], parent: this },
    );

    // const deployment = new kubernetes.apps.v1.Deployment(
    //   'meshcentral',
    //   {
    //     metadata: {
    //       name: 'meshcentral',
    //       namespace: namespace.metadata.name,
    //     },
    //     spec: {
    //       replicas: 2,
    //       selector: {
    //         matchLabels: {
    //           app: 'meshcentral',
    //         },
    //       },
    //       template: {
    //         metadata: {
    //           labels: {
    //             app: 'meshcentral',
    //           },
    //         },
    //         spec: {
    //           containers: [
    //             {
    //               name: 'meshcentral',
    //               image: 'typhonragewind/meshcentral:mongodb-1.1.35',
    //               imagePullPolicy: 'IfNotPresent',
    //               volumeMounts: [
    //                 {
    //                   name: 'meshcentral-config',
    //                   mountPath: '/opt/meshcentral/meshcentral-data',
    //                 },
    //               ],
    //             },
    //           ],
    //           volumes: [
    //             {
    //               name: 'meshcentral-config',
    //               configMap: { name: configMap.metadata.name },
    //             },
    //           ],
    //         },
    //       },
    //     },
    //   },
    //   { dependsOn: [mongoDb], parent: this },
    // );

    const statefulset = new kubernetes.apps.v1.StatefulSet(
      'meshcentral',
      {
        metadata: {
          name: 'meshcentral',
          namespace: namespace.metadata.name,
        },
        spec: {
          serviceName: 'meshcentral',
          replicas: 1,
          selector: {
            matchLabels: {
              app: 'meshcentral',
            },
          },
          template: {
            metadata: {
              labels: {
                app: 'meshcentral',
              },
            },
            spec: {
              containers: [
                {
                  name: 'meshcentral',
                  image: 'typhonragewind/meshcentral:mongodb-1.1.35',
                  imagePullPolicy: 'IfNotPresent',
                  resources: {
                    requests: {
                      cpu: '200m',
                      memory: '256Mi',
                    },
                    limits: {
                      cpu: '400m',
                      memory: '512Mi',
                    },
                  },

                  readinessProbe: {
                    initialDelaySeconds: 50,
                    periodSeconds: 10,
                    timeoutSeconds: 5,
                    httpGet: {
                      path: '/health.ashx',
                      port: 4430,
                    },
                  },
                  livenessProbe: {
                    initialDelaySeconds: 50,
                    periodSeconds: 10,
                    timeoutSeconds: 5,
                    httpGet: {
                      path: '/health.ashx',
                      port: 4430,
                    },
                  },
                  volumeMounts: [
                    {
                      name: 'meshcentral-config',
                      mountPath: '/opt/meshcentral/meshcentral-data/config.json',
                      subPath: 'config.json',
                    },
                  ],
                },
              ],
              volumes: [
                {
                  name: 'meshcentral-config',
                  configMap: { name: configMap.metadata.name },
                },
              ],
            },
          },
        },
      },
      { dependsOn: [mongoDb], parent: this },
    );

    // Service
    const service = new kubernetes.core.v1.Service(
      'meshcentral',
      {
        metadata: {
          name: 'meshcentral',
          namespace: namespace.metadata.name,
        },
        spec: {
          selector: {
            app: 'meshcentral',
          },
          ports: [{ port: 4430 }],
        },
      },
      { dependsOn: [namespace], parent: this },
    );

    // Ingress
    const ingress = new kubernetes.networking.v1.Ingress(
      'meshcentral',
      {
        metadata: {
          name: 'meshcentral',
          namespace: namespace.metadata.name,
          annotations: {
            'cert-manager.io/issuer': 'meshcentral-ca',
            'nginx.ingress.kubernetes.io/affinity': 'cookie',
            'nginx.ingress.kubernetes.io/affinity-mode': 'persistent',
            'nginx.ingress.kubernetes.io/session-cookie-name': 'MESHCENTRAL_SERVER',
            'nginx.ingress.kubernetes.io/session-cookie-expires': '172800',
            'nginx.ingress.kubernetes.io/session-cookie-max-age': '172800',
            'nginx.ingress.kubernetes.io/proxy-read-timeout': '3600',
            'nginx.ingress.kubernetes.io/proxy-send-timeout': '3600',
          },
        },
        spec: {
          ingressClassName: 'nginx',
          rules: [
            {
              host: 'meshcentral.home',
              http: {
                paths: [
                  {
                    path: '/',
                    pathType: 'Prefix',
                    backend: { service: { name: service.metadata.name, port: { number: 4430 } } },
                  },
                ],
              },
            },
          ],
          tls: [{ hosts: ['meshcentral.home'], secretName: 'meshcentral-tls' }],
        },
      },
      { dependsOn: [ca], parent: this },
    );
  }
}
