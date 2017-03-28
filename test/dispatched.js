import chai, { expect } from 'chai';
import chaiRedux from '../src';
import reducer from './example-reducer';
import _ from 'lodash';

chai.use(chaiRedux);

describe('dispatched', () => {

    it('should not have dispatched action TEST-3', () => {
        const store = chai.createReduxStore(reducer);
        store.dispatch({type: 'TEST'});
        expect(store).not.to.have.dispatched('TEST-3');
        expect(store).not.to.have.dispatched({type: 'TEST-3'});
    });

    it('should not have dispatched action TEST', () => {
        const store = chai.createReduxStore(reducer);
        store.dispatch({type: 'TEST'});
        expect(store).to.have.dispatched('TEST');
        expect(store).to.have.dispatched({type: 'TEST'});
    });

    it('should eventually have action TEST', (done) => {
        const store = chai.createReduxStore(reducer);
        _.delay(store.dispatch, 50, ({type: 'TEST'}));
        expect(store).to.have.eventually
            .dispatched('TEST')
            .notify(done);
    });

});


