# Chai Redux

This is an extension plugin for chai assertion library for testing redux stores.

Because testing should be as easy as:

```js
const store = chai.createReduxStore({reducer, middleware: [thunk]});
// when
store.dispatch(fetchData());
// then
expect(store).to.eventually.have
    .dispatched('FETCH')
    .then.dispatched(
        {type: 'SUCCESSFUL', name: 'redux'})
    .notify(done);
```

For more insights read [Why I created chai-redux](https://medium.com/p/9704563fedef)

## Install

Required peer dependencies:

- chai >= 1.1.0
- redux >= 3.1.3

```
$ npm install --save-dev chai-redux
```

## Setup

```js
import chai from 'chai'
import chaiRedux from 'chai-redux'

chai.use(chaiRedux)
```

## API

### Creating Store

**chai.createReduxStore({reducer, middlewares, initialState)})**

#### Arguments:

1. reducer (Function, Object):  
   1.1 Function: A reducing function that returns the next state tree, given the current state tree and an action to handle.  
   1.2 Object: An object whose values correspond to different reducing functions that need to be combined into one.
2. middlewares ([Function]) : Optional functions that conform to the Redux middleware API.
3. initialState (Object): initial state of store

#### Example

```js
import chai, { expect } from 'chai';
import thunk from 'redux-thunk';
import chaiRedux from 'chai-redux';

import reducerA from './reducerA';
import reducerB from './reducerB';

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

Asserts that store state history contains _state_, using deep equal.

```js
expect(store).to.have.state({loading: false, value: null});
expect(store).not.to.have.state({loading: false, value: null});
expect(store).to.have
    .state({loading: false, value: null})
    .and.state({loading: true, value: 42});
```

**.state.like(state: any)**

Asserts that store state history contains _state_, using partial deep comparison.

```js
expect(store).to.have.state.like({loading: false});
expect(store).to.have
    .state.like({value: null})
    .and.state.like({value: 42});
```

**.then.state(state: any)**

Asserts that _state_ is next state in state history.

```js
expect(store).to.have
    .state({loading: false})
    .then.state({loading: true});
```

then.state and then.dispatched cannot be mixed.

**.dispatched(action: String, Object)**

Asserts that store action history contains _action_, using partial deep comparison.

```js
expect(store).to.have
    .dispatched({type: 'LOAD'});
expect(store).to.have
    .dispatched('LOAD');
```

**.then.dispatched(state: any)**

Asserts that _state_ is next state in state history.

```js
expect(store).to.have
    .dispatched('LOAD')
    .then.dispatched({type: 'RESET'});
```

then.state and then.dispatched cannot be mixed.

**.eventually**, **.notify(done: function)**

Asserts that history contains _state_ or _action_.
It will wait till store history contains _state_ or _action_.
Once state is found _done_ is notified.

```js
expect(store).to.have.eventually
    .state({loading: false, value: null})
    .and.state.like({loading: true})
    .and.dispatched('LOAD')
    .notify(done);

// test
store.dispatch({type: 'LOAD'});
```

## License

chai-redux is Open Source software released under the
[Apache 2.0 license](http://www.apache.org/licenses/LICENSE-2.0.html).
