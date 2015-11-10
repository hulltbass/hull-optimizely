import hull from 'hull';

export default class Hull {

  constructor(config) {
    const client = hull.client({
      orgUrl: config.orgUrl,
      appId: config.platformId,
      appSecret: config.platformSecret
    });
    this.client = client;
  }

  exec(method, path, params={}) {
    return new Promise((resolve, reject) => {
      this.client[method](path, params, (err, data) => {
        err ? reject(err) : resolve({ data });
      });
    })
  }

  get(path, params) {
    return this.exec('get', path, params);
  }

  put(path, params) {
    return this.exec('put', path, params);
  }

}

