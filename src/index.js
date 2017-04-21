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
            __history: [{ state, action }]
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
        let { compareState, values } = _defaults(options, defaultOptions);
        const isAsync = utils.flag(this, 'eventually') || false;
        const isChained = utils.flag(this, 'then') || false;
        const lastIndex = utils.flag(this, 'lastIndex');
        utils.flag(this, 'then', false);
        const hasValue = () => {
            if (isChained) {
                return values().length > lastIndex + 1
                    && compareState(values()[lastIndex + 1], expectedState)
            } else {
                return !!values().find((state) => compareState(state, expectedState));
            }
        };

        const updateLastIndex = () => {
            const index = values().findIndex((state) => compareState(state, expectedState));
            utils.flag(this, 'lastIndex', index);
        };

        if (isAsync === true && !hasValue()) {
            const checkForValue = () => {
                if (hasValue()) {
                    updateLastIndex();
                    utils.flag(this, 'notify.done', true);
                } else {
                    setTimeout(checkForValue, 1);
                }
            };
            checkForValue();
        } else {
            this.assert(
                hasValue(),
                options.messages.positive,
                options.messages.negated,
                JSON.stringify(expectedState),
                JSON.stringify(values())
            );
            utils.flag(this, 'notify.done', true);
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
        const isDone = () => {
            if (utils.flag(this, 'notify.done')) {
                notify();
            } else {
                setTimeout(isDone, 1);
            }
        };
        isDone();
    });
};
