import Hull from './hull';
import Optimizely from 'optimizely-node';
import { createHmac } from 'crypto';

function generateShipSecret(shipId, secret) {
  return createHmac('sha256', secret)
          .update(shipId)
          .digest('hex');
}

function getHullClient(orgUrl, shipId, secret) {
  return new Hull({
    orgUrl,
    platformId: shipId,
    platformSecret: generateShipSecret(shipId, secret)
  });
}

export default class SyncAgent {

  static sync(orgUrl, shipId, secret) {
    return getHullClient(orgUrl, shipId, secret)
      .get(shipId)
      .then((res) => {
        return new SyncAgent(orgUrl, res.data, secret).sync();
      });
  }

  constructor(orgUrl, ship, secret) {
    this.ship = ship;
    this.orgUrl = orgUrl;
    this.secret = secret;
  }

  fetchHullSegments() {
    return this.hull().get('segments').then( res => res.data );
  }

  hull() {
    return getHullClient(this.orgUrl, this.ship.id, this.secret);
  }

  optimizely() {
    return Optimizely(this.getOptimizelyProjectApiKey());
  }

  getOptimizelyProjectId() {
    const settings = this.ship.private_settings || this.ship.settings;
    return settings.optimizely_project_id;
  }

  getOptimizelyProjectApiKey() {
    const settings = this.ship.private_settings;
    return settings.optimizely_api_key;
  }

  // Return only optimizely audiences that
  // have a hull-segment-id in their description
  // and index them by hull-segment-id
  fetchOptimizelyAudiences() {
    const fetch = this.optimizely().audiences.fetchAll({
      project_id: this.getOptimizelyProjectId()
    });
    return fetch.then((audiences) => {
      return audiences.reduce((res, audience) => {
        if (audience.description && audience.description.length > 0) {
          try {
            const description = JSON.parse(audience.description);
            const segmentId = description['hull-segment-id'];
            if (segmentId) {
              res[segmentId] = audience;
            }
          } catch (err) { }
        }
        return res;
      }, {});
    });
  }

  saveAudience(data) {
    const Audiences = this.optimizely().audiences;
    let audience;
    if (Audiences.isInstance(data)) {
      audience = data;
    } else {
      audience = Audiences.create(data);
    }
    return Audiences.save(audience);
  }

  syncAudience(segment, audience) {
    const audienceName = `[hull] ${segment.name}`;
    let saved;
    if (audience) {
      if (audience.name === audienceName) {
        saved = Promise.resolve(audience);
      } else {
        audience.name = audienceName;
        saved = this.saveAudience(audience);
      }
    } else {
      saved = this.saveAudience({
        name: audienceName,
        description: JSON.stringify({ 'hull-segment-id' : segment.id }),
        conditions: '[]',
        project_id: this.getOptimizelyProjectId()
      });
    }
    return saved.then((audience) => {
      return {
        name: segment.name,
        audience_id: audience.id,
        segment_id: segment.id
      }
    });
  }

  saveAudienceSettings(audiences) {
    const settings = Object.assign(
      {},
      this.ship.settings,
      { audiences }
    );
    return this.hull().put(this.ship.id, { settings });
  }

  sync() {
    const segments = this.fetchHullSegments();
    const audiences = this.fetchOptimizelyAudiences();

    return new Promise((resolve, reject) => {
      return Promise.all([segments, audiences]).then((res) => {
        const [ segments, audiences ] = res;
        const syncing = segments.map((segment) => {
          return this.syncAudience(segment, audiences[segment.id]);
        });

        return Promise.all(syncing).then((audienceSettings) => {
          this.saveAudienceSettings(audienceSettings).then((savedShip) => {
            return resolve(savedShip.data);
          })
        });
      }, reject);
    });
  }

}




