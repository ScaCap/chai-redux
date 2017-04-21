import chai, { expect } from 'chai';
import chaiRedux from '../src';
import reducer from './example-reducer';
import _delay from 'lodash.delay';

chai.use(chaiRedux);

describe('dispatched', () => {

    it('should not have dispatched action TEST-3', () => {
        const store = chai.createReduxStore({ reducer });
        store.dispatch({ type: 'TEST' });
        expect(store).not.to.have.dispatched('TEST-3');
        expect(store).not.to.have.dispatched({ type: 'TEST-3' });
    });

    it('should not have dispatched action TEST', () => {
        const store = chai.createReduxStore({ reducer });
        store.dispatch({ type: 'TEST' });
        expect(store).to.have.dispatched('TEST');
        expect(store).to.have.dispatched({ type: 'TEST' });
    });

    it('should eventually have action TEST', (done) => {
        const store = chai.createReduxStore({ reducer });
        _delay(store.dispatch, 50, ({ type: 'TEST' }));
        expect(store).to.have.eventually
            .dispatched('TEST')
            .notify(done);
    });

    it('should eventually have actions TEST-1 and TEST', (done) => {
        const store = chai.createReduxStore({ reducer });
        store.dispatch({ type: 'TEST-1' });
        _delay(store.dispatch, 50, ({ type: 'TEST' }));
        expect(store).to.have.eventually
            .dispatched({ type: 'TEST-1' })
            .and.dispatched({ type: 'TEST' })
            .notify(done);
    });

    it('should eventually have actions TEST-1, TEST', (done) => {
        const store = chai.createReduxStore({ reducer });
        store.dispatch({ type: 'TEST-1' });
        _delay(store.dispatch, 50, ({ type: 'TEST' }));
        expect(store).to.have.eventually
            .dispatched('TEST-1')
            .and.dispatched('TEST')
            .notify(done);
    });

});


