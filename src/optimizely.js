export default class Optimizely {

  static init(element, deployment, hull) {
    return new Optimizely(hull, deployment.ship.settings);
  }

  constructor(hull, settings = {}) {
    this.hull = hull;
    this.settings = settings;
    this.currentAudiences = [];
    this.audiencesMap = {};

    const audiencesSettings = settings.audiences || [];

    if (audiencesSettings.length > 0) {
       this.audiencesMap = audiencesSettings.reduce((map, audience) => {
        map[audience.segment_id] = audience;
        return map;
       }, {});
    }

    this.hull.on('hull.user.*', this.sync.bind(this));
    this.sync();
  }

  push(data) {
    window['optimizely'] = window['optimizely'] || [];
    const { push } = window['optimizely'];
    if (push) {
      return push(data);
    }
  }

  pushUser(user) {
    if (!user) return;
    const userId = user.id;
    const type = 'user';
    const { name, email } = user;
    const attributes = { name, email };

    this.push({ type, userId, attributes });
  }

  pushEvent(eventName, tags = {}) {
    const type = 'event';
    this.push({ type, eventName, tags });
  }

  pushPage(pageName, tags = {}) {
    const type = 'page';
    this.push({ type, eventName, tags });
  }

  pushTags(tags) {
    const type = 'tags';
    this.push({ type, tags });
  }

  addToAudience(...ids) {
    return ids.map((i)=> i && this.push(['addToAudience', i]));
  }

  removeFromAudience(...ids) {
    return ids.map((i)=> i && this.push(['removeFromAudience', i]));
  }

  setCurrentAudiences(ids) {
    if (ids && ids.length > 0) {
      this.currentAudiences = ids;
      this.addToAudience(...ids)
    } else {
      this.removeFromAudience(...this.currentAudiences);
      this.currentAudiences = [];
    }
  }

  customTag(tags) {
    this.push(['customTag', tags]);
  }

  getAudienceIdForSegment(segment) {
    if (segment) {
      const audience = this.audiencesMap[segment.id];
      return audience && audience.audience_id;
    }
  }

  syncUser() {
    const user = this.hull.currentUser();
    if (user) {
      return this.pushUser(user);
    }

  }

  syncSegments() {
    const user = this.hull.currentUser();
    if (user) {
      return this.hull.api('me/segments').then((segments = []) => {
        const audiencesIds = segments.map(segment => {
          return this.getAudienceIdForSegment(segment);
        });
        this.setCurrentAudiences(audiencesIds);
        return audiencesIds;
      });
    } else {
      this.setCurrentAudiences(null);
    }
  }

  sync() {
    this.syncUser();
    this.syncSegments();
  }

}

