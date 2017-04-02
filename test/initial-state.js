import chai, { expect } from 'chai';
import chaiRedux from '../src';
import reducer from './example-reducer';

chai.use(chaiRedux);

describe('initialState', () => {

    it('should have been set', () => {
        let initialState = { value: { firstName: 'Jane', lastName: 'Doe' }, loading: false, loaded: true };
        let store = chai.createReduxStore({
            reducer,
            initialState
        });
        expect(store.getState()).to.eql(initialState);
        expect(store).to.have.state(initialState);
    });

});


