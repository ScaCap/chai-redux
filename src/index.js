import _ from 'lodash';
import { createStore, combineReducers, applyMiddleware } from 'redux';

const NO_REDUX_SPY = 'expected #{act} to be redux store spy. ' +
    'You can create a redux store spy like this: chai.createReduxStore(reducers, middleware)';

const partialEquals = (obj, exptected) =>
    _.chain(obj)
        .pick(_.keys(exptected))
        .isEqual(exptected)
        .value();

const partialEqualList = (objs, exptecteds) =>
    _.chain(exptecteds)
        .map(state => _.some(objs, state))
        .every(included => included)
        .value();

export default (chai, utils) => {
    let { Assertion } = chai;

    chai.createReduxStore = (reducers, middleware) => {
        let reduxStore;
        const history = store => next => action => {
            reduxStore.__actions.push(action);
            let result = next(action);
            let state = reduxStore.getState();
            reduxStore.__states.push(state);
            reduxStore.__history.push({ action, state: state });
            return result;
        };

        let storeReducers = reducers;
        if (!_.isFunction(reducers)) {
            storeReducers = combineReducers(reducers);
        }
        let middlewareAsArray = middleware || [];
        if (_.isFunction(middleware)) {
            middlewareAsArray = [middleware];
        }
        middlewareAsArray.push(history);

        reduxStore = createStore(storeReducers, applyMiddleware(...middlewareAsArray));
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

    let checkSingleState = function (expectedState, compareState = _.isEqual) {
        const store = this._obj;
        const isAsync = utils.flag(this, 'eventually');
        if (isAsync === true) {
            const checkForState = () => {
                if (_.some(store.__states, (state) => compareState(state, expectedState))) {
                    utils.flag(this, 'notify.done', true);
                } else {
                    setTimeout(checkForState, 1);
                }
            };
            checkForState();
        } else {
            // let currentState = store.getState();
            this.assert(
                _.some(store.__states, (state) => compareState(state, expectedState))
                , 'expected state history to contain #{act}'
                , 'expected state history not to contain #{act}'
                , expectedState
                , store.__states
            );
            utils.flag(this, 'notify.done', true);
        }
    };

    const hasAllStatesEquals = (states, expectedStates) => {
        let clonedStates = _.clone(states);
        let removedAllFoundItems = _.chain(expectedStates)
            .filter(state => {
                let result = _.pull(clonedStates, state);
                return !(result && !!result[0]);
            })
            .value();

        return removedAllFoundItems.length === 0;
    };

    let checkStates = function (expectedStates, hasAllStates = hasAllStatesEquals) {
        const store = this._obj;
        const isAsync = utils.flag(this, 'eventually');

        if (isAsync === true) {
            const checkForState = () => {
                if (hasAllStates(store.__states, expectedStates)) {
                    utils.flag(this, 'notify.done', true);
                } else {
                    setTimeout(checkForState, 1);
                }
            };
            checkForState();
        } else {
            this.assert(
                hasAllStates(store.__states, expectedStates)
                , 'expected states history to include #{exp}, history is #{act}'
                , 'expected states history not to include #{exp}, history is #{act} '
                , JSON.stringify(expectedStates)
                , JSON.stringify(store.__states)
            );
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
        const isState = utils.flag(this, 'state');
        const isStates = utils.flag(this, 'states');
        if (isState) {
            let compareState = partialEquals;
            checkSingleState.call(this, expectedState, compareState);
        } else if (isStates) {
            let compareStatesLike = partialEqualList;
            checkStates.call(this, expectedState, compareStatesLike);
        } else {
            throw new chai.AssertionError('like must only be used in combination with state or states');
        }
    });

    Assertion.addMethod('dispatched', function dispatched(expectedAction) {
        const isAsync = utils.flag(this, 'eventually');
        const store = this._obj;
        let action = _.isString(expectedAction) ? { type: expectedAction } : expectedAction;

        let hasAction = () => _.some(store.__actions, (existingAction) => partialEquals(existingAction, action));

        if (isAsync) {
            const checkForAction = () => {
                if (hasAction()) {
                    utils.flag(this, 'notify.done', true);
                } else {
                    setTimeout(checkForAction, 1);
                }
            };
            checkForAction();
        } else {
            this.assert(
                hasAction()
                , 'expected action history to include #{exp}, history is #{act}'
                , 'expected action to not be #{exp} '
                , expectedAction
                , store.__actions
            );
            utils.flag(this, 'notify.done', true);
        }
    });
};
