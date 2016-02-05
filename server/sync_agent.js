import Hull from 'hull';
import Optimizely from 'optimizely-node';
import Promise from 'bluebird';

export default class SyncAgent {

  static sync(hull, ship, options={}) {
    const agent = new SyncAgent(hull, ship, options);
    return agent.sync();
  }

  constructor(hull, ship, options={}) {
    this.hull = hull;
    this.ship = ship;
    this.options = options || {};
    this.__debug__ = { started_at: new Date(), line: 0 };
  }

  debug(msg, data) {
    try {
      if (this.options.debug) {
        this.__debug__.line  += 1;
        const { orgUrl, platformId } = this.hull.configuration();
        const key = `[${[new Date().toISOString(), platformId, this.__debug__.line].join(' - ')}]`;
        if (data) {
          console.log(key, msg, JSON.stringify(data));
        } else {
          console.log(key, msg);
        }
      }
    } catch(err) {
      console.warn('dbg error', err);
    }
  }

  fetchHullSegments() {
    this.debug('fetchHullSegments')
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
    this.debug('fetchOptimizelyAudiences');
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
    this.debug('saveAudience');
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
    this.debug('syncAudience');
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
      this.debug('Audience saved', audience.name);
      return {
        name: segment.name,
        audience_id: audience.id,
        segment_id: segment.id
      }
    });
  }

  saveAudienceSettings(audiences) {
    this.debug('saveAudienceSettings')
    const settings = Object.assign(
      {},
      this.ship.settings,
      { audiences }
    );
    return this.hull.put(this.ship.id, { settings });
  }

  sync() {
    this.debug('Starting sync');
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
            this.debug('Sync done');
            return resolve(savedShip);
          })
        });
      });
    });
  }

}




