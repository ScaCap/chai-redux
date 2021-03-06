let reducer = (state = { value: null, loading: false, loaded: false }, action) => {
    switch (action.type) {
        case 'TRIGGER':
            return { value: null, loading: true, loaded: false };
        case 'LOADED':
            return {
                value: { firstName: action.firstName, lastName: action.lastName },
                loading: false,
                loaded: true
            };
        case 'LOADING_ERROR':
            return { value: null, loading: false, loaded: false };
    }
    return state;
};

export default reducer;
