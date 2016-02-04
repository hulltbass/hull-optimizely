import Hull from 'hull';
import Optimizely from 'optimizely-node';

export default class SyncAgent {

  static sync(hull, ship) {
    const agent = new SyncAgent(hull, ship);
    return agent.sync();
  }

  constructor(hull, ship) {
    this.hull = hull;
    this.ship = ship;
  }

  fetchHullSegments() {
    return this.hull.get('segments');
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
            return resolve(savedShip);
          })
        });
      }, reject);
    });
  }

}




