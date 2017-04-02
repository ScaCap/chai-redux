import chai, { expect } from 'chai';
import chaiRedux from '../src';
import reducer from './example-reducer';
import _delay from 'lodash.delay';

chai.use(chaiRedux);

describe('states', () => {

    it('should wait for all states', (done) => {
        let store = chai.createReduxStore({ reducer });
        expect(store).to.eventually.have
            .state({ value: null, loading: false, loaded: false })
            .and.state({ value: null, loading: true, loaded: false })
            .and.state({ value: { firstName: 'Jane', lastName: 'Doe' }, loading: false, loaded: true })
            .and.state({ value: { firstName: 'Max', lastName: 'Mustermann' }, loading: false, loaded: true })
            .and.state({ value: null, loading: false, loaded: false })
            .notify(done);
        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
        _delay(store.dispatch, 50, { type: 'LOADING_ERROR' });
    });

    it('should have all states', () => {
        let store = chai.createReduxStore({ reducer });
        // when
        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
        store.dispatch({ type: 'LOADING_ERROR' });
        // then
        expect(store).to.have
            .state({ value: null, loading: false, loaded: false })
            .and.state({ value: null, loading: true, loaded: false })
            .and.state({ value: { firstName: 'Jane', lastName: 'Doe' }, loading: false, loaded: true })
            .and.state({ value: { firstName: 'Max', lastName: 'Mustermann' }, loading: false, loaded: true })
            .and.state({ value: null, loading: false, loaded: false });
    });

    it('should not have state', () => {
        let store = chai.createReduxStore({
            reducer,
            initialState: { value: { firstName: 'Jane', lastName: 'Doe' }, loading: false, loaded: true }
        });
        expect(store).not.to.have
            .state({ value: null, loading: false, loaded: false });
    });

});

