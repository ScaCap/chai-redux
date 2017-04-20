'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _lodash = require('lodash.isequal');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.pick');

var _lodash4 = _interopRequireDefault(_lodash3);

var _lodash5 = require('lodash.defaults');

var _lodash6 = _interopRequireDefault(_lodash5);

var _redux = require('redux');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var partialEquals = function partialEquals(obj, exptected) {
    var allExpectedKeys = Object.keys(exptected);
    var partialObject = (0, _lodash4.default)(obj, allExpectedKeys);
    return (0, _lodash2.default)(partialObject, exptected);
};

var isFunction = function isFunction(value) {
    return typeof value === 'function';
};
var isString = function isString(value) {
    return typeof value === 'string';
};

exports.default = function (chai, utils) {
    var Assertion = chai.Assertion;

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

    chai.createReduxStore = function (_ref) {
        var reducer = _ref.reducer,
            middleware = _ref.middleware,
            initialState = _ref.initialState;

        var reduxStore = void 0;
        var history = function history(store) {
            return function (next) {
                return function (action) {
                    reduxStore.__actions.push(action);
                    var result = void 0;
                    try {
                        result = next(action);
                    } catch (e) {
                        console.error('Error when calling middleware. ' + 'Did you forget to setup a middleware?');
                        throw e;
                    }
                    var state = reduxStore.getState();
                    reduxStore.__states.push(state);
                    reduxStore.__history.push({ action: action, state: state });
                    return result;
                };
            };
        };

        var storeReducers = reducer;
        if (!isFunction(reducer)) {
            storeReducers = (0, _redux.combineReducers)(reducer);
        }
        var middlewareAsArray = middleware || [];
        if (isFunction(middleware)) {
            middlewareAsArray = [middleware];
        }
        middlewareAsArray.push(history);

        reduxStore = (0, _redux.createStore)(storeReducers, initialState, _redux.applyMiddleware.apply(undefined, _toConsumableArray(middlewareAsArray)));
        var action = { type: '@@INIT' };
        var state = reduxStore.getState();
        Object.assign(reduxStore, {
            __isProxyStore: true,
            __actions: [action],
            __states: [state],
            __history: [{ state: state, action: action }]
        });
        return reduxStore;
    };

    var checkIfIsStoreProxyAndAddFlag = function checkIfIsStoreProxyAndAddFlag(flag) {
        return function () {
            var obj = this._obj;
            new Assertion(obj.__isProxyStore).to.be.true;
            utils.flag(this, flag, true);
        };
    };

    var defaultOptions = {
        compareState: _lodash2.default,
        messages: {
            positive: 'expected state history #{act} to contain #{exp}',
            negated: 'expected state history #{act} not to contain #{exp}'
        }
    };

    var verifyValues = function verifyValues(expectedState) {
        var _this = this;

        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        // declare and initiate
        var _defaults2 = (0, _lodash6.default)(options, defaultOptions),
            compareState = _defaults2.compareState,
            values = _defaults2.values;

        var isAsync = utils.flag(this, 'eventually') || false;
        var isChained = utils.flag(this, 'then') || false;
        var lastIndex = function lastIndex() {
            return utils.flag(_this, 'lastIndex');
        };
        var chainIndex = utils.flag(this, 'chainIndex') || 0;

        var updateAssertions = function updateAssertions(value) {
            var assertions = utils.flag(_this, 'assertions') || [];
            assertions[chainIndex] = value;
            utils.flag(_this, 'assertions', assertions);
        };

        // assert current value
        var hasValue = function hasValue() {
            if (isChained) {
                var nextIndex = lastIndex() + 1;
                return values().length > nextIndex && compareState(values()[nextIndex], expectedState);
            } else {
                return !!values().find(function (state) {
                    return compareState(state, expectedState);
                });
            }
        };

        var updateLastIndex = function updateLastIndex() {
            var index = values().findIndex(function (state) {
                return compareState(state, expectedState);
            });
            utils.flag(_this, 'lastIndex', index);
        };

        // assertion is false by default
        updateAssertions(false);
        // update chain count
        utils.flag(this, 'chainIndex', chainIndex + 1);
        // reset then flag. Only then can set it to true
        utils.flag(this, 'then', false);

        if (isAsync === true) {
            var checkForValue = function checkForValue() {
                if (hasValue()) {
                    updateAssertions(true);
                    updateLastIndex();
                } else {
                    setTimeout(checkForValue, 1);
                }
            };
            checkForValue();
        } else {
            updateAssertions(hasValue());
            var assertions = utils.flag(this, 'assertions') || [];
            this.assert(assertions.filter(function (assertion) {
                return assertion;
            }).length === assertions.length, options.messages.positive, options.messages.negated, JSON.stringify(expectedState), JSON.stringify(values()));
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
    Assertion.addProperty('then', function () {
        checkIfIsStoreProxyAndAddFlag('then').call(this, 'then');
        if (utils.flag(this, 'lastIndex') === undefined) {
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
        var _this2 = this;

        verifyValues.call(this, expectedState, { values: function values() {
                return _this2._obj.__states;
            } });
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
        var _this3 = this;

        var isState = utils.flag(this, 'state');
        if (isState) {
            verifyValues.call(this, expectedState, {
                compareState: partialEquals,
                values: function values() {
                    return _this3._obj.__states;
                },
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
        var _this4 = this;

        var action = isString(expectedAction) ? { type: expectedAction } : expectedAction;
        verifyValues.call(this, action, {
            compareState: partialEquals,
            values: function values() {
                return _this4._obj.__actions;
            },
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
    Assertion.addMethod('notify', function () {
        var _this5 = this;

        var notify = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

        var isDone = function isDone() {
            var assertions = utils.flag(_this5, 'assertions') || [];
            if (assertions.filter(function (assertion) {
                return assertion;
            }).length === assertions.length) {
                notify();
            } else {
                setTimeout(isDone, 1);
            }
        };
        isDone();
    });
};
