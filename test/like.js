import chai, {expect} from 'chai';
import chaiRedux from '../src';
import reducer from './example-reducer';
import biggerReducer from './bigger-example-reducer';
import _delay from 'lodash.delay';

chai.use(chaiRedux);

describe('like', () => {

    it('should wait for all states (partial deep comparison)', (done) => {
        let store = chai.createReduxStore({reducer});
        expect(store).to.eventually.have
            .state.like({value: {firstName: 'Jane', lastName: 'Doe'}})
            .and.state.like({value: {firstName: 'Max', lastName: 'Mustermann'}})
            .notify(done);
        store.dispatch({type: 'TRIGGER'});
        store.dispatch({type: 'LOADED', firstName: 'Jane', lastName: 'Doe'});
        store.dispatch({type: 'LOADING_ERROR'});
        _delay(store.dispatch, 50, {type: 'LOADED', firstName: 'Max', lastName: 'Mustermann'});
    });

    it('should wait for all more complex states (partial deep comparison)', (done) => {
        let store = chai.createReduxStore({reducer: biggerReducer});
        expect(store).to.eventually.have
            .state.like({value: {personalData: {firstName: 'Jane', lastName: 'Doe'}}})
            .and.state.like({value: {personalData: {firstName: 'Max', lastName: 'Mustermann'}}})
            .notify(done);
        store.dispatch({type: 'TRIGGER'});
        store.dispatch({type: 'LOADED', value: {personalData: {firstName: 'Jane', lastName: 'Doe'}}});
        store.dispatch({type: 'LOADING_ERROR'});
        _delay(store.dispatch, 50, {type: 'LOADED', value: {personalData: {firstName: 'Max', lastName: 'Mustermann'}}});
    });

    it('should have all states (partial deep comparison)', () => {
        let store = chai.createReduxStore({reducer});
        store.dispatch({type: 'LOADED', firstName: 'Jane', lastName: 'Doe'});
        store.dispatch({type: 'LOADED', firstName: 'Max', lastName: 'Mustermann'});
        store.dispatch({type: 'LOADING_ERROR'});
        expect(store).to.have.state.like({value: {firstName: 'Jane', lastName: 'Doe'}})
            .and.state.like({value: null});
    });

});
