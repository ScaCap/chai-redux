import chai, { expect } from 'chai';
import chaiRedux from '../src';
import reducer from './example-reducer';
import _ from 'lodash';

chai.use(chaiRedux);

describe('like', () => {

    it('should wait for all states (partial deep comparison)', (done) => {
        let store = chai.createReduxStore(reducer);
        expect(store).to.eventually.have.states.like([
            { value: { firstName: 'Jane', lastName: 'Doe' } },
            { value: { firstName: 'Max', lastName: 'Mustermann' } }
        ]).notify(done);
        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' });
        store.dispatch({type: 'LOADING_ERROR'});
        _.delay(store.dispatch, 50, { type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
    });

    it('should have all states (partial deep comparison)', () => {
        let store = chai.createReduxStore(reducer);
        store.dispatch({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
        store.dispatch({ type: 'LOADING_ERROR' });
        expect(store).to.have.states.like([
            { value: { firstName: 'Jane', lastName: 'Doe' } },
            { value: null }
        ]);
    });

});
