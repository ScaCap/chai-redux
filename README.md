# Chai Redux

This is an extension plugin for chai assertion library to test complex redux stores.

## Installation

Required peer dependencies:

- chai >=1.1.0
- redux >=3.1.3

```
$ npm run install chai-redux
```

## Setup

```
import chai from 'chai'
import chaiRedux from 'chai-redux'

chai.use(chaiRedux)

```


## Quick Example

```
// reducer
let delayedAction = (value) => (dispatch) => {
    setTimeout(() => {
        dispatch({ type: 'ASYNC_ACTION', value });
    }, 20);
};

let reducer = (state = { updated: false, value: null }, action) => {
    if (action.type === 'ASYNC_ACTION') {
        return { updated: true, value: action.value };
    }
    return state;
};

// test

import chai, { expect } from 'chai';
import chaiRedux from '../src';
import thunk from 'redux-thunk';

chai.use(chaiRedux);

describe('async update', () => {

    it('should eventually have two states', (done) => {
        const store = chai.createReduxStore({reducer, middlewares: [thunk]});
        store.dispatch(delayedAction(13));
        expect(store).to.eventually.have
            .state({ updated: false, value: null })
            .then.state({ updated: true, value: 13 })
            .notify(done);
    });

    it('should eventually have dispatched action ASYNC_ACTION', (done) => {
        const store = chai.createReduxStore(reducer, thunk);
        store.dispatch(delayedAction(13));
        expect(store).to.eventually.have
            .dispatched('ASYNC_ACTION')
            .notify(done);
    });

});

```

## API

### Creating Store

**chai.createReduxStore({reducer, middlewares, initialState)})**

#### Arguments:

1. reducer (Function, Object): 
 1.1 Function: A reducing function that returns the next state tree, given the current state tree and an action to handle
 1.2 Object: An object whose values correspond to different reducing functions that need to be combined into one.
2. middlewares ([Function]) : Optional functions that conform to the Redux middleware API.
3. initialState (Object): initial state of store

#### Example

```
import chai, { expect } from 'chai';
import chaiRedux from '../src';
import thunk from 'redux-thunk';
import reducerA from '//';
import reducerB from '//';

chai.use(chaiRedux);

describe('create test store', () => {

    it('should create store', () => {
        const store = chai.createReduxStore({
            reducer: {
                a: reducerA,
                b: reducerB
            },
            middlewares: [thunk],
            initialState: {a: {/* ... /*}, b: {/* ... /*}}
        });
    });

});

```

### Assertions

**.state(state: any)**

Asserts that store state history contains *state*, using deep equal. 

```
expect(store).to.have.state({loading: false, value: null});
expect(store).not.to.have.state({loading: false, value: null});
expect(store).to.have
    .state({loading: false, value: null})
    .and.state({loading: true, value: 42});
``` 

**.state.like(state: any)**

Asserts that store state history contains *state*, using partial deep comparison. 

```
expect(store).to.have.state.like({loading: false});
expect(store).to.have
    .state.like({value: null})
    .and.state.like({value: 42});
``` 

**.then.state(state: any)**

Asserts that *state* is next state in state history.

```
expect(store).to.have
    .state({loading: false})
    .then.state({loading: true});
``` 

then.state and then.dispatched cannot be mixed.

**.dispatched(action: String, Object)**

Asserts that store action history contains *action*, using partial deep comparison.

```
expect(store).to.have
    .dispatched({type: 'LOAD'});
expect(store).to.have
    .dispatched('LOAD');
``` 

**.then.dispatched(state: any)**

Asserts that *state* is next state in state history.

```
expect(store).to.have
    .dispatched('LOAD')
    .then.dispatched({type: 'RESET'});
``` 

then.state and then.dispatched cannot be mixed.

**.eventually**, **.notify(done: function)**

Asserts that history contains *state* or *action*. 
It will wait till store history contains *state* or *action*. 
Once state is found *done* is called.

```
expect(store).to.have.eventually
    .state({loading: false, value: null})
    .and.state.like({loading: true})
    .and.dispatched('LOAD')
    .notify(done);
// test
store.dispatch({type: 'LOAD'});
```
