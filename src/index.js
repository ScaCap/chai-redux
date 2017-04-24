/*
 * Copyright 2017 Scalable Capital.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import _isEqual from 'lodash.isequal';
import _pick from 'lodash.pick';
import _defaults from 'lodash.defaults';
import { createStore, combineReducers, applyMiddleware } from 'redux';

const partialEquals = (obj, exptected) => {
  let allExpectedKeys = Object.keys(exptected);
  let partialObject = _pick(obj, allExpectedKeys);
  return _isEqual(partialObject, exptected);
};

const isFunction = (value) => typeof value === 'function';
const isString = (value) => typeof value === 'string';

export default (chai, utils) => {
    let { Assertion } = chai;

    /**
     * ### chai.createReduxStore
     *
     * Creates a redux store.
     *
     * @param reducer (Function, Object):Function: A reducing function Object: An object whose values correspond to
     * different reducing functions.
     * @param middleware ([Function]) : Optional functions that conform to the Redux middleware API.
     * @param initialState (Object): initial state of store
     * @returns {Store<S>|*} extended redux store to be used with chai expect.
     */
    chai.createReduxStore = ({ reducer, middleware, initialState }) => {
        let reduxStore;
        /**
         * middleware
         * --------------
         * When action is dispatched it will
         * - store action
         * - store nextState
         * - notify all (internal) listeners
         */
        const history = store => next => action => {
            reduxStore.__actions.push(action);
            let result;
            try {
                result = next(action);
            }catch (e) {
                console.error('Error when calling middleware. ' +
                    'Did you forget to setup a middleware?');
                throw e;
            }
            let state = reduxStore.getState();
            reduxStore.__states.push(state);
            reduxStore.__history.push({ action, state: state });
            reduxStore.__listener.forEach(listener => {listener()});
            return result;
        };

        let storeReducers = reducer;
        if (!isFunction(reducer)) {
            storeReducers = combineReducers(reducer);
        }
        let middlewareAsArray = middleware || [];
        if (isFunction(middleware)) {
            middlewareAsArray = [middleware];
        }
        middlewareAsArray.push(history);

        reduxStore = createStore(storeReducers, initialState, applyMiddleware(...middlewareAsArray));
        let action = { type: '@@INIT' };
        const state = reduxStore.getState();
        Object.assign(reduxStore, {
            __isProxyStore: true,
            __actions: [action],
            __states: [state],
            __history: [{ state, action }],
            __listener: [],
            // will notify listener when an action is dispatched
            __subscribe: function (listener) {
                this.__listener.push(listener);
                return () => {
                    this.__listener = this.__listener.filter(l => l !== listener);
                };
            }

        });
        return reduxStore;
    };

    let checkIfIsStoreProxyAndAddFlag = function (flag) {
        return function () {
            let obj = this._obj;
            new Assertion(obj.__isProxyStore).to.be.true;
            utils.flag(this, flag, true);
        };
    };

    const defaultOptions = {
        compareState: _isEqual,
        messages: {
            positive: 'expected state history #{act} to contain #{exp}',
            negated: 'expected state history #{act} not to contain #{exp}'
        }
    };

    let verifyValues = function (expectedState, options = {}) {
        // declare and initiate
        let { compareState, values } = _defaults(options, defaultOptions);
        const isAsync = utils.flag(this, 'eventually') || false;
        const isChained = utils.flag(this, 'then') || false;
        const lastIndex = () => utils.flag(this, 'lastIndex');
        const chainIndex = utils.flag(this, 'chainIndex') || 0;

        const updateAssertions = (value) => {
            const assertions = utils.flag(this, 'assertions') || [];
            assertions[chainIndex] = value;
            utils.flag(this, 'assertions', assertions);
        };

        // assert current value
        const hasValue = () => {
            if (isChained) {
                let nextIndex = lastIndex() + 1;
                return values().length > nextIndex
                    && compareState(values()[nextIndex], expectedState)
            } else {
                return !!values().find((state) => compareState(state, expectedState));
            }
        };

        const updateLastIndex = () => {
            const index = values().findIndex((state) => compareState(state, expectedState));
            utils.flag(this, 'lastIndex', index);
        };

        // assertion is false by default
        updateAssertions(false);
        // update chain count
        utils.flag(this, 'chainIndex', chainIndex + 1);
        // reset then flag. Only then can set it to true
        utils.flag(this, 'then', false);

        if (isAsync === true) {
            let unsubscribe;
            const checkForValue = () => {
                if (hasValue()) {
                    updateAssertions(true);
                    updateLastIndex();
                    unsubscribe();
                }
            };
            unsubscribe = this._obj.__subscribe(checkForValue);
            checkForValue();
        } else {
            updateAssertions(hasValue());
            const assertions = utils.flag(this, 'assertions') || [];
            this.assert(
                assertions.filter(assertion => assertion).length === assertions.length,
                options.messages.positive,
                options.messages.negated,
                JSON.stringify(expectedState),
                JSON.stringify(values())
            );
            updateLastIndex();
        }

    };

    /**
     * ### .eventually
     *
     * Sets the `eventually` flag.
     * later used by the `dispatched`, `state` or `like` assertion.
     *
     *     expect(store).to.eventually.have.state({loaded: true});
     *     expect(store).to.eventually.have.dispatched('FETCH');
     *
     */
    Assertion.addProperty('eventually', checkIfIsStoreProxyAndAddFlag('eventually'));

    /**
     * ### .then
     *
     * Sets the `then` flag.
     * later used by the `dispatched`, `state` or `like` assertion.
     *
     *     expect(store).to.eventually.have.state({loaded: true});
     *     expect(store).to.eventually.have.state.like({loaded: true});
     *
     */
    Assertion.addProperty('then', function(){
        checkIfIsStoreProxyAndAddFlag('then').call(this, 'then');
        if(utils.flag(this, 'lastIndex') === undefined){
            utils.flag(this, 'lastIndex', -1);
        }
    });

    /**
     * ### .state(state)
     *
     * Asserts that store's state history contains `state`. Will use deep equal to compare objects.
     *
     *     expect(store).to.have.state({b: 'a'});
     *     expect(store).not.to.have.state({a: 'b'});
     *     expect(store).to.have.state({b: 'a'}).and.state({b: 'b'});
     *
     * When used in conjunction with `eventually` it will wait till store state history
     * contains `state` or timeout.
     *
     *     expect(store).to.eventually.have.state({loaded: true});
     *
     * When chained with `then` it will assert store's state history contains `state`s in order.
     *
     *     expect(store).to.have.state({b: 'a'}).then.state({b: 'b'});
     *
     * @param {...String|Array|Object} state
     *
     */
    Assertion.addChainableMethod('state', function (expectedState) {
        verifyValues.call(this, expectedState, { values: () => this._obj.__states });
    }, checkIfIsStoreProxyAndAddFlag('state'));

    /**
     * ### .state.like(state)
     *
     * Asserts that store state history contains a `state`. It will perform a partial deep
     * comparison. returning true if `state` has equivalent property values.
     *
     *     expect(store).to.have.state.like({b: 'a'});
     *     expect(store).not.to.have.state.like({a: 'b'});
     *     expect(store).to.have.state({b: 'a'}).and.state.like({b: 'b'});
     *
     * When used in conjunction with `eventually` it will wait till store state history
     * contains `state` or timeout.
     *
     *     expect(store).to.eventually.have.state.like({loaded: true});
     *
     * When chained with `then` it will assert store's state history contains `state`s in order.
     *
     *     expect(store).to.have.state.like({b: 'a'}).then.state({b: 'b'});
     *
     * @param {...Array|Object|String} states
     *
     */
    Assertion.addMethod('like', function (expectedState) {
        const isState = utils.flag(this, 'state');
        if (isState) {
            verifyValues.call(this, expectedState, {
                compareState: partialEquals,
                values: () => this._obj.__states,
                messages: {
                    positive: 'expected state history #{act} to contain #{exp} (partial equals)',
                    negated: 'expected state history #{act} not to contain #{exp} (partial equals)'
                }
            });
        } else {
            throw new chai.AssertionError('like must only be used in combination with state');
        }
    });

    /**
     * ### .dispatched(action)
     *
     * Asserts that store's action history contains `action`.
     *
     * When passed an object it will perform a partial deep comparison. returning true if `action` has equivalent
     * property values.
     *
     *     expect(store).to.have.dispatched({type: 'FETCH'});
     *     expect(store).not.to.have.dispatched({type: 'FETCH'});
     *     expect(store).to.have.dispatched({type: 'FETCH'}).and.dispatched({type: 'SUCCESSFUL'});
     *
     * When passed a string it will compare it to `action.type`.
     *
     *     expect(store).to.have.dispatched('FETCH');
     *
     * When used in conjunction with `eventually` it will wait till store's action history
     * contains `action` or timeout.
     *
     *     expect(store).to.eventually.have.dispatched('FETCH');
     *
     * When chained with `then` it will assert store's state history contains `state`s in order.
     *
     *     expect(store).to.have.dispatched('FETCH').then.dispatched({type: 'SUCCESSFUL'});
     *
     * @param {...Array|Object|String} states
     *
     */
    Assertion.addMethod('dispatched', function dispatched(expectedAction) {
        let action = isString(expectedAction) ? { type: expectedAction } : expectedAction;
        verifyValues.call(this, action, {
            compareState: partialEquals,
            values: () => this._obj.__actions,
            messages: {
                positive: 'expected action history #{act} to contain #{exp} (partial equals)',
                negated: 'expected action history #{act} not to contain #{exp} (partial equals)'
            }
        });
    });

    /**
     * ### .notify
     *
     * Will trigger callback once `state`, `dispatched` or `like` assertion has passed.
     * Can be used to notify testing framework that test is completed.
     *
     *     expect(store).to.eventually.have.state({loaded: true}).notify(done);
     *
     */
    Assertion.addMethod('notify', function (notify = () => {}) {
        let unsubscribe;
        const isDone = () => {
            const assertions = utils.flag(this, 'assertions') || [];
            if (assertions.filter(assertion => assertion).length === assertions.length) {
                unsubscribe();
                notify();
            }
        };
        unsubscribe = this._obj.__subscribe(isDone);
        isDone();
    });
};
