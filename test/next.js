import chai, { expect } from 'chai';
import chaiRedux from '../src';
import reducer from './example-reducer';
import _delay from 'lodash.delay';

chai.use(chaiRedux);

describe('next', () => {

    it('weird chains - dispatched', (done) => {
        let store = chai.createReduxStore({ reducer });
        store.dispatch({ type: 'LOADING_ERROR' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
        _delay(store.dispatch, 50, { type: 'TRIGGER' });
        _delay(store.dispatch, 10, { type: 'LOADED' });

        expect(store).to.finally.have
            .dispatched('TRIGGER')
            .and.dispatched('LOADED')
            .and.dispatched('LOADED')
            .and.dispatched('LOADING_ERROR')
            .notify(done);
    });

    it('weird chains', (done) => {
        let store = chai.createReduxStore({ reducer });
        _delay(store.dispatch, 50, { type: 'LOADING_ERROR' });
        _delay(store.dispatch, 10, { type: 'LOADED', firstName: 'Maria', lastName: 'Mustermann' });
        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });

        expect(store).to.finally.have
            .dispatched('TRIGGER')
            .next.dispatched({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' })
            .next.dispatched({ type: 'LOADED', firstName: 'Maria', lastName: 'Mustermann' })
            .next.dispatched('LOADING_ERROR')
            .notify(done);
    });

    it('should handle same actions correctly', (done) => {
        let store = chai.createReduxStore({ reducer });
        _delay(store.dispatch, 50, { type: 'LOADING_ERROR' });
        _delay(store.dispatch, 10, { type: 'LOADED', firstName: 'Maria', lastName: 'Mustermann' });
        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });

        expect(store).to.finally.have
            .dispatched('TRIGGER')
            .next.dispatched('LOADED')
            .next.dispatched('LOADED')
            .next.dispatched('LOADING_ERROR')
            .notify(done);
    });

    it('should wait for all chained states', (done) => {
        let store = chai.createReduxStore({ reducer });

        expect(store).to.finally.have
            .state({ value: null, loading: false, loaded: false })
            .next.state({ value: null, loading: true, loaded: false })
            .next.state({ value: { firstName: 'Jane', lastName: 'Doe' }, loading: false, loaded: true })
            .next.state({ value: { firstName: 'Max', lastName: 'Mustermann' }, loading: false, loaded: true })
            .next.state({ value: null, loading: false, loaded: false })
            .notify(done);

        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
        _delay(store.dispatch, 50, { type: 'LOADING_ERROR' });

    });

    it('should have all chained states', () => {
        let store = chai.createReduxStore({ reducer: reducer });
        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
        store.dispatch({ type: 'LOADING_ERROR' });

        expect(store).to.have
            .state({ value: null, loading: false, loaded: false })
            .next.have.state({ value: null, loading: true, loaded: false })
            .next.have.state({ value: { firstName: 'Jane', lastName: 'Doe' }, loading: false, loaded: true })
            .next.have.state({ value: { firstName: 'Max', lastName: 'Mustermann' }, loading: false, loaded: true })
            .next.have.state({ value: null, loading: false, loaded: false });
    });

    it('should not fail if next is used as first state check', () => {
        let store = chai.createReduxStore({ reducer: reducer });
        expect(store).to.have
            .next.state({ value: null, loading: false, loaded: false });
    });

    it('should only work in correct order', () => {
        let store = chai.createReduxStore({ reducer: reducer });
        store.dispatch({ type: 'TRIGGER' });
        store.dispatch({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' });
        store.dispatch({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' });
        store.dispatch({ type: 'LOADING_ERROR' });

        const correctChain = () => expect(store).to.have
            .dispatched({ type: 'TRIGGER' })
            .and.dispatched({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' })
            .and.dispatched({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' })
            .and.dispatched({ type: 'LOADING_ERROR' });

        expect(correctChain).not.to.throw(/expected/);

        const wrongChain = () => expect(store).to.have
            .dispatched({ type: 'TRIGGER' })
            .next.dispatched({ type: 'LOADED', firstName: 'Max', lastName: 'Mustermann' })
            .next.dispatched({ type: 'LOADED', firstName: 'Jane', lastName: 'Doe' })
            .next.dispatched({ type: 'LOADING_ERROR' });

        expect(wrongChain).to.throw(/expected/)
    });

});

