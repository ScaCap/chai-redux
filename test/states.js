import chai, { expect } from 'chai';
import chaiRedux from '../src';
import reducer from './example-reducer';
import _ from 'lodash';

chai.use(chaiRedux);

describe('states', () => {

    it('should wait for all states', (done) => {
        let store = chai.createReduxStore(reducer);
        expect(store).to.eventually.have.states([
            { value: null, loading: false, loaded: false },
            { value: null, loading: true, loaded: false },
            { value: { firstName: 'Jane', lastName: 'Doe' }, loading: false, loaded: true },
            { value: { firstName: 'Max', lastName: 'Mustermann' }, loading: false, loaded: true },
            { value: null, loading: false, loaded: false }
        ]).notify(done);
        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
        _.delay(store.dispatch, 50, { type: 'LOADING_ERROR' });
    });

    it('should have all states', () => {
        let store = chai.createReduxStore(reducer);
        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
        store.dispatch({ type: 'LOADING_ERROR' });

        expect(store).to.have.states([
            { value: null, loading: true, loaded: false },
            { value: { firstName: 'Jane', lastName: 'Doe' }, loading: false, loaded: true },
            { value: { firstName: 'Max', lastName: 'Mustermann' }, loading: false, loaded: true },
            { value: null, loading: false, loaded: false }
        ]);
    });

});

