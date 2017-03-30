'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _redux = require('redux');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var NO_REDUX_SPY = 'expected #{act} to be redux store spy. ' + 'You can create a redux store spy like this: chai.createReduxStore(reducers, middleware)';

var partialEquals = function partialEquals(obj, exptected) {
    return _lodash2.default.chain(obj).pick(_lodash2.default.keys(exptected)).isEqual(exptected).value();
};

var partialEqualList = function partialEqualList(objs, exptecteds) {
    return _lodash2.default.chain(exptecteds).map(function (state) {
        return _lodash2.default.some(objs, state);
    }).every(function (included) {
        return included;
    }).value();
};

exports.default = function (chai, utils) {
    var Assertion = chai.Assertion;


    chai.createReduxStore = function (reducers, middleware) {
        var reduxStore = void 0;
        var history = function history(store) {
            return function (next) {
                return function (action) {
                    reduxStore.__actions.push(action);
                    var result = next(action);
                    var state = reduxStore.getState();
                    reduxStore.__states.push(state);
                    reduxStore.__history.push({ action: action, state: state });
                    return result;
                };
            };
        };

        var storeReducers = reducers;
        if (!_lodash2.default.isFunction(reducers)) {
            storeReducers = (0, _redux.combineReducers)(reducers);
        }
        var middlewareAsArray = middleware || [];
        if (_lodash2.default.isFunction(middleware)) {
            middlewareAsArray = [middleware];
        }
        middlewareAsArray.push(history);

        reduxStore = (0, _redux.createStore)(storeReducers, _redux.applyMiddleware.apply(undefined, _toConsumableArray(middlewareAsArray)));
        var action = { type: '@@INIT' };
        var state = reduxStore.getState();
        _lodash2.default.assign(reduxStore, {
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

    var checkSingleState = function checkSingleState(expectedState) {
        var _this = this;

        var compareState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _lodash2.default.isEqual;

        var store = this._obj;
        var isAsync = utils.flag(this, 'eventually');
        if (isAsync === true) {
            var checkForState = function checkForState() {
                if (_lodash2.default.some(store.__states, function (state) {
                    return compareState(state, expectedState);
                })) {
                    utils.flag(_this, 'notify.done', true);
                } else {
                    setTimeout(checkForState, 1);
                }
            };
            checkForState();
        } else {
            // let currentState = store.getState();
            this.assert(_lodash2.default.some(store.__states, function (state) {
                return compareState(state, expectedState);
            }), 'expected state history to contain #{act}', 'expected state history not to contain #{act}', expectedState, store.__states);
            utils.flag(this, 'notify.done', true);
        }
    };

    var hasAllStatesEquals = function hasAllStatesEquals(states, expectedStates) {
        var clonedStates = _lodash2.default.clone(states);
        var removedAllFoundItems = _lodash2.default.chain(expectedStates).filter(function (state) {
            var result = _lodash2.default.pull(clonedStates, state);
            return !(result && !!result[0]);
        }).value();

        return removedAllFoundItems.length === 0;
    };

    var checkStates = function checkStates(expectedStates) {
        var _this2 = this;

        var hasAllStates = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : hasAllStatesEquals;

        var store = this._obj;
        var isAsync = utils.flag(this, 'eventually');

        if (isAsync === true) {
            var checkForState = function checkForState() {
                if (hasAllStates(store.__states, expectedStates)) {
                    utils.flag(_this2, 'notify.done', true);
                } else {
                    setTimeout(checkForState, 1);
                }
            };
            checkForState();
        } else {
            this.assert(hasAllStates(store.__states, expectedStates), 'expected states history to include #{exp}, history is #{act}', 'expected states history not to include #{exp}, history is #{act} ', JSON.stringify(expectedStates), JSON.stringify(store.__states));
            utils.flag(this, 'notify.done', true);
        }
    };

    /**
     * ### .eventually
     *
     * Sets the `eventually` flag
     * later used by the `states`, `state` and `like` assertion.
     *
     *     expect(store).to.eventually.have.state({loaded: true});
     *     expect(store).to.eventually.have.state.like({loaded: true});
     *
     */
    Assertion.addProperty('eventually', checkIfIsStoreProxyAndAddFlag('eventually'));

    /**
     * ### .state(state)
     *
     * Asserts that store state history contains `state`. Will use deep equal to compare objects
     *
     * When used in conjunction with `eventually` it will wait till store state history
     * contains `state` or timeout.
     *
     *     expect(store).to.have.state({b: 'a'});
     *     expect(store).not.to.have.state({a: 'b'});
     *     expect(store).to.eventually.have.state({loaded: true});
     *
     * @param {...String|Array|Object} state
     *
     */
    Assertion.addChainableMethod('state', checkSingleState, checkIfIsStoreProxyAndAddFlag('state'));

    /**
     * ### .states([states])
     *
     * Asserts that store state history contains all `states`. Will use deep equal to compare objects.
     *
     * When used in conjunction with `eventually` it will wait until store state history
     * contains all `states` or timeout.
     *
     *     expect(store).to.have.states([{b: 'a'}]);
     *     expect(store).not.to.have.states([{a: 'b'}, {c: 'd'}]);
     *     expect(store).to.eventually.have.states([{loaded: false}, {loaded: true}]);
     *
     * @param {...Array} states
     *
     */
    Assertion.addChainableMethod('states', checkStates, checkIfIsStoreProxyAndAddFlag('states'));

    /**
     * ### .notify
     *
     * Will trigger callback once `state`, `states` or `like` have passed.
     * Can be used to notify testing framework that test is completed
     *
     *     expect(store).to.eventually.have.state({loaded: true}).notify(done);
     *
     */
    Assertion.addMethod('notify', function () {
        var _this3 = this;

        var notify = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _lodash2.default.noop;

        var isDone = function isDone() {
            if (utils.flag(_this3, 'notify.done')) {
                notify();
            } else {
                setTimeout(isDone, 1);
            }
        };
        isDone();
    });

    /**
     * ### .states(state|[states])
     *
     * Asserts that store state history contains all `states` or `state`. Will performs a partial deep
     * comparison. returning true if `state` has equivalent property values.
     *
     * When used in conjunction with `eventually` it will wait until store state history
     * contains `state` / all `states`. Otherwise will timeout
     *
     *     expect(store).to.have.state.like({b: 'a'});
     *     expect(store).to.eventually.have.states.like([{loaded: false}, {loaded: true, loading: false}]);
     *
     * @param {...Array|Object|String} states
     *
     */
    Assertion.addMethod('like', function (expectedState) {
        var isState = utils.flag(this, 'state');
        var isStates = utils.flag(this, 'states');
        if (isState) {
            var compareState = partialEquals;
            checkSingleState.call(this, expectedState, compareState);
        } else if (isStates) {
            var compareStatesLike = partialEqualList;
            checkStates.call(this, expectedState, compareStatesLike);
        } else {
            throw new chai.AssertionError('like must only be used in combination with state or states');
        }
    });

    Assertion.addMethod('dispatched', function dispatched(expectedAction) {
        var _this4 = this;

        var isAsync = utils.flag(this, 'eventually');
        var store = this._obj;
        var action = void 0;

        var mapStringToAction = function mapStringToAction(value) {
            return _lodash2.default.isString(value) ? { type: value } : value;
        };

        var hasAction = void 0;
        if (_lodash2.default.isArray(expectedAction)) {
            action = expectedAction.map(mapStringToAction);
            hasAction = function hasAction() {
                return partialEqualList(store.__actions, action);
            };
        } else {
            action = _lodash2.default.isString(expectedAction) ? { type: expectedAction } : expectedAction;
            hasAction = function hasAction() {
                return _lodash2.default.some(store.__actions, function (existingAction) {
                    return partialEquals(existingAction, action);
                });
            };
        }

        if (isAsync) {
            var checkForAction = function checkForAction() {
                if (hasAction()) {
                    utils.flag(_this4, 'notify.done', true);
                } else {
                    setTimeout(checkForAction, 1);
                }
            };
            checkForAction();
        } else {
            this.assert(hasAction(), 'expected action history to include #{exp}, history is #{act}', 'expected action to not be #{exp} ', expectedAction, store.__actions);
            utils.flag(this, 'notify.done', true);
        }
    });
};
