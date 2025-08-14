/**
 * State Management Module
 * Functional approach to immutable state management
 */

// Create an immutable state container
export const createState = (initialState = {}) => {
  const state = structuredClone ? structuredClone(initialState) : JSON.parse(JSON.stringify(initialState));
  
  return Object.freeze({
    // Get the current state
    get: () => Object.freeze(structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state))),
    
    // Create a new state with updates
    update: (updates) => {
      const newState = { ...state, ...updates };
      return createState(newState);
    },
    
    // Update a nested property using a path
    setIn: (path, value) => {
      const pathArray = Array.isArray(path) ? path : path.split('.');
      const newState = structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
      
      let current = newState;
      for (let i = 0; i < pathArray.length - 1; i++) {
        const key = pathArray[i];
        if (!(key in current)) {
          current[key] = {};
        }
        current = current[key];
      }
      
      current[pathArray[pathArray.length - 1]] = value;
      return createState(newState);
    },
    
    // Get a nested property using a path
    getIn: (path, defaultValue = undefined) => {
      const pathArray = Array.isArray(path) ? path : path.split('.');
      let current = state;
      
      for (const key of pathArray) {
        if (current == null || !(key in current)) {
          return defaultValue;
        }
        current = current[key];
      }
      
      return current;
    },
    
    // Merge deep updates
    mergeDeep: (updates) => {
      const merge = (target, source) => {
        const result = { ...target };
        
        for (const key in source) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = merge(target[key] || {}, source[key]);
          } else {
            result[key] = source[key];
          }
        }
        
        return result;
      };
      
      return createState(merge(state, updates));
    },
  });
};

// Create a state reducer
export const createReducer = (reducer, initialState = {}) => {
  let currentState = createState(initialState);
  
  return {
    // Get current state
    getState: () => currentState.get(),
    
    // Dispatch an action
    dispatch: (action) => {
      const newStateData = reducer(currentState.get(), action);
      currentState = createState(newStateData);
      return currentState.get();
    },
    
    // Subscribe to state changes
    subscribe: (() => {
      const listeners = new Set();
      
      return {
        add: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        
        notify: (state, action) => {
          for (const listener of listeners) {
            listener(state, action);
          }
        },
      };
    })(),
  };
};

// Lens utilities for immutable updates
export const createLens = (getter, setter) => ({
  get: getter,
  set: setter,
  
  // Modify a value through the lens
  modify: (fn) => (state) => setter(fn(getter(state)))(state),
  
  // Compose with another lens
  compose: (otherLens) => createLens(
    (state) => otherLens.get(getter(state)),
    (value) => (state) => setter(otherLens.set(value)(getter(state)))(state)
  ),
});

// Common lenses
export const lenses = {
  // Property lens
  prop: (key) => createLens(
    (obj) => obj[key],
    (value) => (obj) => ({ ...obj, [key]: value })
  ),
  
  // Path lens
  path: (path) => {
    const pathArray = Array.isArray(path) ? path : path.split('.');
    
    return createLens(
      (obj) => {
        let current = obj;
        for (const key of pathArray) {
          if (current == null) return undefined;
          current = current[key];
        }
        return current;
      },
      (value) => (obj) => {
        const newObj = structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
        let current = newObj;
        
        for (let i = 0; i < pathArray.length - 1; i++) {
          const key = pathArray[i];
          if (!(key in current)) {
            current[key] = {};
          }
          current = current[key];
        }
        
        current[pathArray[pathArray.length - 1]] = value;
        return newObj;
      }
    );
  },
  
  // Index lens for arrays
  index: (i) => createLens(
    (arr) => arr[i],
    (value) => (arr) => {
      const newArr = [...arr];
      newArr[i] = value;
      return newArr;
    }
  ),
};

// History management for undo/redo
export const createHistory = (initialState, maxSize = 100) => {
  const history = [initialState];
  let currentIndex = 0;
  
  return {
    // Get current state
    current: () => history[currentIndex],
    
    // Push a new state
    push: (state) => {
      // Remove any states after current index (no redo after new change)
      history.splice(currentIndex + 1);
      
      // Add new state
      history.push(state);
      
      // Limit history size
      if (history.length > maxSize) {
        history.shift();
      } else {
        currentIndex++;
      }
      
      return state;
    },
    
    // Undo to previous state
    undo: () => {
      if (currentIndex > 0) {
        currentIndex--;
        return history[currentIndex];
      }
      return null;
    },
    
    // Redo to next state
    redo: () => {
      if (currentIndex < history.length - 1) {
        currentIndex++;
        return history[currentIndex];
      }
      return null;
    },
    
    // Check if can undo/redo
    canUndo: () => currentIndex > 0,
    canRedo: () => currentIndex < history.length - 1,
    
    // Get history info
    getInfo: () => ({
      size: history.length,
      currentIndex,
      canUndo: currentIndex > 0,
      canRedo: currentIndex < history.length - 1,
    }),
  };
};

// State machine for agent workflows
export const createStateMachine = (config) => {
  const { initial, states, context = {} } = config;
  let currentState = initial;
  let currentContext = createState(context);
  
  return {
    // Get current state and context
    getState: () => ({
      state: currentState,
      context: currentContext.get(),
    }),
    
    // Transition to a new state
    transition: (event) => {
      const stateConfig = states[currentState];
      if (!stateConfig) {
        throw new Error(`Unknown state: ${currentState}`);
      }
      
      const transition = stateConfig.on?.[event.type];
      if (!transition) {
        return null; // No transition for this event
      }
      
      // Determine next state
      const nextState = typeof transition === 'string' 
        ? transition 
        : transition.target;
      
      // Execute actions if any
      if (transition.actions) {
        for (const action of transition.actions) {
          const newContext = action(currentContext.get(), event);
          currentContext = createState(newContext);
        }
      }
      
      // Guard check
      if (transition.guard && !transition.guard(currentContext.get(), event)) {
        return null;
      }
      
      // Exit current state
      if (stateConfig.exit) {
        stateConfig.exit(currentContext.get(), event);
      }
      
      // Update state
      currentState = nextState;
      
      // Enter new state
      const newStateConfig = states[nextState];
      if (newStateConfig?.entry) {
        newStateConfig.entry(currentContext.get(), event);
      }
      
      return {
        state: currentState,
        context: currentContext.get(),
      };
    },
    
    // Check if can transition
    can: (event) => {
      const stateConfig = states[currentState];
      return stateConfig?.on?.[event.type] != null;
    },
  };
};

// Memoization for expensive computations
export const memoize = (fn, keyFn = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  const memoized = (...args) => {
    const key = keyFn(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
  
  // Add cache management methods
  memoized.clear = () => cache.clear();
  memoized.delete = (key) => cache.delete(key);
  memoized.has = (key) => cache.has(key);
  memoized.size = () => cache.size;
  
  return memoized;
};

// Selector for derived state
export const createSelector = (...args) => {
  const selectors = args.slice(0, -1);
  const combiner = args[args.length - 1];
  
  const memoizedCombiner = memoize(combiner);
  
  return (state) => {
    const values = selectors.map(selector => selector(state));
    return memoizedCombiner(...values);
  };
};

// Immutable update helpers
export const updateHelpers = {
  // Set a value
  set: (path, value) => (state) => 
    lenses.path(path).set(value)(state),
  
  // Update with a function
  update: (path, fn) => (state) =>
    lenses.path(path).modify(fn)(state),
  
  // Push to array
  push: (path, ...values) => (state) =>
    lenses.path(path).modify(arr => [...(arr || []), ...values])(state),
  
  // Remove from array
  filter: (path, predicate) => (state) =>
    lenses.path(path).modify(arr => (arr || []).filter(predicate))(state),
  
  // Toggle boolean
  toggle: (path) => (state) =>
    lenses.path(path).modify(val => !val)(state),
  
  // Increment/decrement
  increment: (path, amount = 1) => (state) =>
    lenses.path(path).modify(val => (val || 0) + amount)(state),
  
  // Merge objects
  merge: (path, updates) => (state) =>
    lenses.path(path).modify(obj => ({ ...(obj || {}), ...updates }))(state),
};