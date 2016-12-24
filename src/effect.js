'use strict'

const Effects = require('./effects').Effects;

/* Symbols for private fields of effect class */
const _id      = Symbol('id');
const _options = Symbol('options');
const _type    = Symbol('type');
const _target  = Symbol('target'); 
const _elapsed = Symbol('elapsed');
const _started = Symbol('started');
const _effect  = Symbol('effect');

/* Effect class -- instantiates new effect, can be used to check for validity of effect, can be used 
 * @param {id: string, options: object, type: string, target: NPC | Player } 
 * @return 
*/
class Effect {

  constructor({ id, options, type, target }) {
    validate(id, options, type, target);
    this[_id]      = id;
    this[_type]    = type;
    this[_target]  = target;
    this[_options] = options;
    this[_effect]  = Effects.get(target, type, options);

    this[_effect].activate(options, target);
    if (this[_options].activate) { this[_options].activate(target); }
  }

  /* 
   * Called when the effect is initialized 
   * or when it is loaded back onto the player after login.
   * 1) Sets up timing if necessary.
   * 2) Sets up event listeners.
   * 3) //TODO: Sets up attribute modifiers
   */
  init() {
    const target  = this[_target];
    const options = this[_options];
    
    if (options.duration) {
      this[_started] = options.started || Date.now();
      this[_elapsed] = options.elapsed || 0;
    }
      
    const effect = this[_effect];

    target.on('quit', () => {
      this.setElapsed();
      effect.deactivate(options, target);
    });

    const events = effect.events         || {};
    
    for (let event in events) {
      const handler = events[event];
      if (!handler) { throw new ReferenceError("An event was registered for an effect, but it had no handler."); }
      target.on(event, handler);
    }

    const modifiers = effect.modifiers;
    for (let attr in modifiers) {
      const modifier = modifiers[attr];
      if (!modifier) { throw new ReferenceError("An attribute modifier was registered but it had no callback."); }
      target.setModifier(attr, modifier);
    }

  }

  /* Get private fields... */
  getId()      { return this[_id];      }
  getOptions() { return this[_options]; }
  getType()    { return this[_type];    }
  getTarget()  { return this[_target];  }

  /* Get fields from generic effect, for player-friendly consumption. */
  getName()        { return this[_event].name; }
  getDescription() { return this[_event].desc; }
  getAura()        { return this[_event].aura; }

  getDuration() { 
    return parseInt(this[_options].duration, 10) || Infinity; 
  }

  getElapsed() { 
    if (isNaN(this[_started])) { return null; }
    return Date.now() - this[_started];
  }

  // Safely returns an empty object if there are no defined modifiers.
  getModifiers() {
    return this[_effect].modifiers || {};
  }

  /* Mutators */
  setElapsed() { this[_elapsed] = this.getElapsed(); }

  /* Predicates */
  isCurrent()      { return this.isTemporary() ? this.getElapsed() < this.getDuration() : true; }
  isTemporary()    { return this.getDuration() < Infinity; }
  isValid()        { return this.isCurrent() && this.checkPredicate(); }
  
  checkPredicate() { 
    const options   = this[_options];
    const predicate = options.predicate;
    return predicate ? 
      predicate() : 
      true;
  }

  /* Proxies for effect/optional methods */
  deactivate() {
    this[_effect].deactivate();
    if (this[_options].deactivate) { 
      this[_options].deactivate(); 
    }
    const events = effect.events || {};
    for (let event in events) {
      target.removeListener(event)
    }
  }
}

/* Validation helper for effect construction */
const validate = (id, options, type, target) => {
  if (!id) { 
    throw new ReferenceError("Effects must have an ID to prevent stacking."); 
  }
  if (!options || !Object.keys(options).length) { 
    throw new ReferenceError("Effects must take an options object to pass to applicable functions when evaluating effects."); 
  }
  if (!type) { 
    throw new ReferenceError("Effects must have a generic effect type."); 
  }
  if (!target) { 
    throw new ReferenceError("Effects must have a target."); 
  }
  if (!(target.addEffect)) { 
    throw new TypeError("Effects can only target players or NPCs."); 
  }
}

exports.Effect = Effect;