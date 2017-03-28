# Chai Redux

This is an extension plugin for chai assertion library to test complex redux stores.

## Installation

Required peer dependencies:

- chai ^3.5.0
- redux ^3.6.0

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
import chai, { expect } from 'chai';
import chaiRedux from '../src';
import thunk from 'redux-thunk';

chai.use(chaiRedux);
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
describe('async update', () => {

    it('should eventually have two states', (done) => {
        const store = chai.createReduxStore(reducer, thunk);
        store.dispatch(delayedAction(13));
        expect(store).to.eventually.have.states([{ updated: false, value: null }, { updated: true, value: 13 }])
            .notify(done);
    });

    it('should eventually have dispatched action ASYNC_ACTION', (done) => {
        const store = chai.createReduxStore(reducer, thunk);
        store.dispatch(delayedAction(13));
        expect(store).to.eventually.have.dispatched('ASYNC_ACTION').notify(done);
    });

});

```

## API

### Creating Store

**chai.createReduxStore(reducer(s), middleware(s))**

#### Arguments:

1. reducer(s) (Function, Object): 
 1.1 reducer (Function): A reducing function that returns the next state tree, given the current state tree and an action to handle
 1.2 reducers (Object): An object whose values correspond to different reducing functions that need to be combined into one. See the notes below for some rules every passed reducer must follow.
2. middleware(s) (Function, [Function]) : Optional functions that conform to the Redux middleware API, single one or multiple as Array.

#### Example

```
import chai, { expect } from 'chai';
import chaiRedux from '../src';
import thunk from 'redux-thunk';
import reducerA from '//';
import reducerB from '//';

describe('create test store', () => {

    it('should work', () => {
        // one store, no middleware
        const store = chai.createReduxStore(reducerA);
        // one store with thunk middleware
        store = chai.createReduxStore(reducerA, thunk);
        // multiple reducers and middlewares
        store = chai.createReduxStore({
            a: reducerA,
            b: reducerB
        }, [thunk, ...]);
    });

});

```

### Assertions

**.state(state: any)**
**.states(states: Array)**

 Asserts that store state history contains `state` or `states`. 
 Will compare states using deep equal. 

```
expect(store).to.have.state({loading: false})
expect(store).to.have.states([{loaded: false}, {loaded: true}])
```

In combination with **.eventually** it will wait till store history contains state.
   
```
expect(store).to.have.eventually.state({loading: true}).notify(done)
store.dispatch({type: 'LOAD'})
```   

**.state.like(state: any)**
**.states.like(states: Array)**

 Asserts that store state history contains all `states` or `state`. 
 Will performs a partial deep comparison. 

```
expect(store).to.have.states.like([{loaded: false}, {loaded: true, data: 'unicorn'}])
```

Can also be used in combination with **.eventually**.
