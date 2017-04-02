import _ from 'lodash';
import { createStore, combineReducers, applyMiddleware } from 'redux';

const partialEquals = (obj, exptected) =>
    _.chain(obj)
        .pick(_.keys(exptected))
        .isEqual(exptected)
        .value();

export default (chai, utils) => {
    let { Assertion } = chai;

    chai.createReduxStore = ({ reducer, middleware, initialState }) => {
        let reduxStore;
        const history = store => next => action => {
            reduxStore.__actions.push(action);
            let result = next(action);
            let state = reduxStore.getState();
            reduxStore.__states.push(state);
            reduxStore.__history.push({ action, state: state });
            return result;
        };

        let storeReducers = reducer;
        if (!_.isFunction(reducer)) {
            storeReducers = combineReducers(reducer);
        }
        let middlewareAsArray = middleware || [];
        if (_.isFunction(middleware)) {
            middlewareAsArray = [middleware];
        }
        middlewareAsArray.push(history);

        reduxStore = createStore(storeReducers, initialState, applyMiddleware(...middlewareAsArray));
        let action = { type: '@@INIT' };
        const state = reduxStore.getState();
        _.assign(reduxStore, {
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
        compareState: _.isEqual,
        messages: {
            positive: 'expected state history #{act} to contain #{exp}',
            negated: 'expected state history #{act} not to contain #{exp}'
        }
    };

    let verifyValues = function (expectedState, options = {}) {
        let { compareState, values } = _.defaults(options, defaultOptions);
        const isAsync = utils.flag(this, 'eventually') || false;
        const isChained = utils.flag(this, 'then') || false;
        const lastIndex = utils.flag(this, 'lastIndex') || 0;
        utils.flag(this, 'then', false);
        const hasValue = () => {
            if (isChained) {
                return values().length > lastIndex + 1
                    && compareState(values()[lastIndex + 1], expectedState)
            } else {
                return _.some(values(), (state) => compareState(state, expectedState));
            }
        };

        const updateLastIndex = () => {
            const index = _.findIndex(values(), (state) => compareState(state, expectedState));
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
     * Sets the `eventually` flag
     * later used by the `states`, `state` and `like` assertion.
     *
     *     expect(store).to.eventually.have.state({loaded: true});
     *     expect(store).to.eventually.have.state.like({loaded: true});
     *
     */
    Assertion.addProperty('eventually', checkIfIsStoreProxyAndAddFlag('eventually'));

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
    Assertion.addProperty('then', checkIfIsStoreProxyAndAddFlag('then'));

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
    Assertion.addChainableMethod('state', function (expectedState) {
        verifyValues.call(this, expectedState, { values: () => this._obj.__states });
    }, checkIfIsStoreProxyAndAddFlag('state'));

    /**
     * ### .like(state)
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

    Assertion.addMethod('dispatched', function dispatched(expectedAction) {
        let action = _.isString(expectedAction) ? { type: expectedAction } : expectedAction;
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
     * Will trigger callback once `state`, `states` or `like` have passed.
     * Can be used to notify testing framework that test is completed
     *
     *     expect(store).to.eventually.have.state({loaded: true}).notify(done);
     *
     */
    Assertion.addMethod('notify', function (notify = _.noop) {
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
